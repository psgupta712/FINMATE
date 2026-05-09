const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Wallet = require('../models/Wallet');

// GET /api/wallet/balance
router.get('/balance', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/wallet/history
router.get('/history', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    const history = [...wallet.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, transactions: history, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/wallet/debit  (internal use: subscription payment from wallet)
router.post('/debit', protect, async (req, res) => {
  try {
    const { amount, description, referenceId } = req.body;
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    if (wallet.balance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    wallet.balance -= amount;
    wallet.transactions.push({ type: 'debit', amount, description, referenceId, balanceAfter: wallet.balance });
    await wallet.save();
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
