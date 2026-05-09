const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const PLANS = {
  premium: { price: 99, durationDays: 30, label: 'Premium Monthly' },
};

// GET /api/subscriptions/status
router.get('/status', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, subscription: sub, plan: req.user.plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subscriptions/create-order  (pay via Razorpay)
router.post('/create-order', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = PLANS[plan].price * 100;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sub_${Date.now()}`,
      notes: { userId: String(req.user._id), purpose: 'subscription', plan },
    });

    const payment = await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      amountInRupees: PLANS[plan].price,
      purpose: 'subscription',
      metadata: { plan },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      plan,
      price: PLANS[plan].price,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subscriptions/verify
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Signature mismatch' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment || payment.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invalid or duplicate payment' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    await payment.save();

    // Activate subscription
    const planInfo = PLANS[plan] || PLANS['premium'];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planInfo.durationDays);

    await Subscription.create({
      user: req.user._id,
      plan: 'premium',
      status: 'active',
      startDate: new Date(),
      endDate,
      paymentId: payment._id,
      amount: planInfo.price,
    });

    await User.findByIdAndUpdate(req.user._id, { plan: 'premium' });

    res.json({ success: true, message: 'Subscription activated!', endDate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Basic expense tracking', 'Budget creation', 'Savings goals (3)', 'Basic chatbot'],
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 99,
        features: ['Everything in Free', 'AI financial insights', 'Unlimited goals', 'PDF/CSV reports', 'Smart alerts', 'Priority support'],
      },
    ],
  });
});

module.exports = router;
