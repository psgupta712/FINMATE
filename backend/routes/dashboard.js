const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Budget = require('../models/Budget');
const Wallet = require('../models/Wallet');
const Subscription = require('../models/Subscription');

// GET /api/dashboard - Full dashboard data
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Last 6 months for chart
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      last6Months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const [transactions, goals, budget, wallet, subscription] = await Promise.all([
      Transaction.find({ user: req.user._id, date: { $gte: startOfMonth, $lte: endOfMonth } }),
      Goal.find({ user: req.user._id }),
      Budget.findOne({ user: req.user._id, month, year }),
      Wallet.findOne({ user: req.user._id }),
      Subscription.findOne({ user: req.user._id }).sort({ createdAt: -1 }),
    ]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: new Date(year, month - 7, 1) },
        }
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        }
      }
    ]);

    const trend = last6Months.map(({ month: m, year: y }) => {
      const inc = monthlyTrend.find(t => t._id.month === m && t._id.year === y && t._id.type === 'income');
      const exp = monthlyTrend.find(t => t._id.month === m && t._id.year === y && t._id.type === 'expense');
      return {
        label: new Date(y, m - 1).toLocaleString('default', { month: 'short' }),
        income: inc?.total || 0,
        expense: exp?.total || 0,
      };
    });

    // Recent transactions
    const recentTx = await Transaction.find({ user: req.user._id }).sort({ date: -1 }).limit(5);

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
        walletBalance: wallet?.balance || 0,
      },
      categoryBreakdown: catMap,
      monthlyTrend: trend,
      goals: {
        total: goals.length,
        completed: goals.filter(g => g.isCompleted).length,
        active: goals.filter(g => !g.isCompleted),
      },
      budget: budget || null,
      recentTransactions: recentTx,
      subscription: {
        plan: req.user.plan,
        status: subscription?.status,
        endDate: subscription?.endDate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
