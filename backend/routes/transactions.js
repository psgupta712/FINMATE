const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Streak = require('../models/Streak');
const { processTransactionLog } = require('../lib/gamification');

// Helper: get or create streak doc
const getOrCreateStreak = async (userId) => {
  let streak = await Streak.findOne({ user: userId });
  if (!streak) streak = await Streak.create({ user: userId });
  return streak;
};

// POST /api/transactions - Add transaction
router.post('/', protect, async (req, res) => {
  try {
    const { type, amount, category, description, date, paymentMethod, isRecurring, tags } = req.body;
    const tx = await Transaction.create({
      user: req.user._id, type, amount, category, description,
      date: date || Date.now(), paymentMethod, isRecurring, tags,
    });

    // Update budget if expense
    if (type === 'expense') {
      const d = new Date(date || Date.now());
      const budget = await Budget.findOne({ user: req.user._id, month: d.getMonth() + 1, year: d.getFullYear() });
      if (budget) {
        const cat = budget.categories.find(c => c.name === category);
        if (cat) { cat.spent += amount; await budget.save(); }
      }
    }

    // 🎮 Gamification: process daily streak
    try {
      const streak = await getOrCreateStreak(req.user._id);
      const xpGain = type === 'income' ? 15 : 10; // income logs give slightly more XP
      const { newBadges } = await processTransactionLog(streak, xpGain);
      return res.status(201).json({ success: true, transaction: tx, newBadges });
    } catch (gamErr) {
      console.error('Gamification error (non-fatal):', gamErr.message);
    }

    res.status(201).json({ success: true, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions - Get all with filters
router.get('/', protect, async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit = 50, page = 1 } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    res.json({ success: true, transactions, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions/summary - Monthly summary
router.get('/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
      { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    let totalIncome = 0, totalExpense = 0;
    const categoryBreakdown = {};

    summary.forEach(s => {
      if (s._id.type === 'income') totalIncome += s.total;
      else {
        totalExpense += s.total;
        categoryBreakdown[s._id.category] = (categoryBreakdown[s._id.category] || 0) + s.total;
      }
    });

    res.json({ success: true, totalIncome, totalExpense, savings: totalIncome - totalExpense, categoryBreakdown, month, year });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;