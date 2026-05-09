const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order  (wallet top-up)
router.post('/create-order', protect, async (req, res) => {
  console.log("USER:", req.user);

  try {
    const { amount } = req.body;
    console.log("AMOUNT:", amount); // 🔍

    const razorpay = getRazorpay();

    console.log("CREATING ORDER..."); // 🔍
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: String(req.user._id), purpose: 'wallet_topup' },
    });

    console.log("ORDER CREATED:", order); // 🔍

    const payment = await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      amount: order.amount,
      amountInRupees: amount,
      purpose: 'wallet_topup',
      status: 'created',
    });

    console.log("PAYMENT SAVED:", payment); // 🔍

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err); // 🚨 VERY IMPORTANT
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments/verify  (after frontend Razorpay checkout)
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Find and update payment
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    if (payment.status === 'paid') return res.status(400).json({ success: false, message: 'Payment already processed' });

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    await payment.save();

    // Credit wallet
    const wallet = await Wallet.findOne({ user: req.user._id });
    wallet.balance += payment.amountInRupees;
    wallet.transactions.push({
      type: 'credit',
      amount: payment.amountInRupees,
      description: 'Wallet Top-up via Razorpay',
      referenceId: razorpay_payment_id,
      balanceAfter: wallet.balance,
    });
    await wallet.save();

    res.json({ success: true, message: 'Payment verified & wallet credited', balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments/webhook  (Razorpay webhook - raw body)
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const body = req.body; // raw buffer
      const expectedSig = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      if (signature !== expectedSig) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.failed') {
      const orderId = event.payload.payment.entity.order_id;
      await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'failed' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payments/history
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
