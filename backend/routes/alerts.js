const express = require('express');
const router = express.Router();
const { protect, premiumOnly } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Wallet = require('../models/Wallet');
const Streak = require('../models/Streak');

// ─── Alert generators ──────────────────────────────────────────────────────────

const generateAlerts = async (userId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const [transactions, budget, goals, wallet, streak] = await Promise.all([
    Transaction.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
    Budget.findOne({ user: userId, month, year }),
    Goal.find({ user: userId, isCompleted: false }),
    Wallet.findOne({ user: userId }),
    Streak.findOne({ user: userId }),
  ]);

  const alerts = [];

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // ── 1. Budget alerts ──────────────────────────────────────────────────────────
  if (budget) {
    const usedPct = (totalExpense / budget.totalBudget) * 100;
    if (usedPct >= 100) {
      alerts.push({
        id: 'budget_exceeded',
        type: 'danger',
        icon: '🚨',
        title: 'Budget Exceeded!',
        message: `You've spent ₹${totalExpense.toLocaleString('en-IN')} — ₹${(totalExpense - budget.totalBudget).toLocaleString('en-IN')} over your ₹${budget.totalBudget.toLocaleString('en-IN')} budget.`,
        action: { label: 'View Budget', href: '/budget' },
        priority: 1,
      });
    } else if (usedPct >= 80) {
      alerts.push({
        id: 'budget_warning',
        type: 'warning',
        icon: '⚠️',
        title: 'Budget Running Low',
        message: `You've used ${usedPct.toFixed(0)}% of your monthly budget. Only ₹${(budget.totalBudget - totalExpense).toLocaleString('en-IN')} left.`,
        action: { label: 'View Budget', href: '/budget' },
        priority: 2,
      });
    }

    // Per-category budget alerts
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    budget.categories.forEach(cat => {
      const spent = catMap[cat.name] || 0;
      const catPct = cat.limit > 0 ? (spent / cat.limit) * 100 : 0;
      if (catPct >= 100) {
        alerts.push({
          id: `cat_exceeded_${cat.name}`,
          type: 'danger',
          icon: '📊',
          title: `${cat.name} Over Limit`,
          message: `You've exceeded your ${cat.name} budget by ₹${(spent - cat.limit).toLocaleString('en-IN')}.`,
          action: { label: 'View Budget', href: '/budget' },
          priority: 3,
        });
      } else if (catPct >= 85) {
        alerts.push({
          id: `cat_warning_${cat.name}`,
          type: 'warning',
          icon: '📊',
          title: `${cat.name} Almost Full`,
          message: `${catPct.toFixed(0)}% of your ${cat.name} budget used (₹${spent.toLocaleString('en-IN')} / ₹${cat.limit.toLocaleString('en-IN')}).`,
          action: { label: 'View Budget', href: '/budget' },
          priority: 4,
        });
      }
    });
  }

  // ── 2. Savings rate alert ─────────────────────────────────────────────────────
  if (totalIncome > 0 && savingsRate < 10) {
    alerts.push({
      id: 'low_savings_rate',
      type: 'warning',
      icon: '💸',
      title: 'Low Savings Rate',
      message: `Your savings rate is ${savingsRate.toFixed(1)}% this month. The recommended minimum is 20%. Try cutting back on non-essentials.`,
      action: { label: 'AI Advice', href: '/chatbot' },
      priority: 3,
    });
  } else if (totalIncome > 0 && savingsRate >= 30) {
    alerts.push({
      id: 'great_savings',
      type: 'success',
      icon: '🎉',
      title: 'Excellent Savings!',
      message: `You're saving ${savingsRate.toFixed(1)}% of your income this month. Keep it up — you're building strong financial habits!`,
      action: { label: 'View Goals', href: '/goals' },
      priority: 6,
    });
  }

  // ── 3. Goal deadline alerts ───────────────────────────────────────────────────
  goals.forEach(goal => {
    const daysLeft = Math.ceil((new Date(goal.deadline) - now) / (1000 * 60 * 60 * 24));
    const pct = (goal.savedAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.savedAmount;

    if (daysLeft < 0) {
      alerts.push({
        id: `goal_overdue_${goal._id}`,
        type: 'danger',
        icon: '⏰',
        title: `Goal Overdue: ${goal.title}`,
        message: `Your "${goal.title}" goal passed its deadline ${Math.abs(daysLeft)} days ago with ₹${remaining.toLocaleString('en-IN')} still needed.`,
        action: { label: 'View Goals', href: '/goals' },
        priority: 2,
      });
    } else if (daysLeft <= 7 && pct < 90) {
      alerts.push({
        id: `goal_urgent_${goal._id}`,
        type: 'warning',
        icon: '🎯',
        title: `Goal Deadline Near: ${goal.title}`,
        message: `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to save ₹${remaining.toLocaleString('en-IN')} for "${goal.title}".`,
        action: { label: 'Add Savings', href: '/goals' },
        priority: 2,
      });
    } else if (daysLeft <= 30 && pct < 50) {
      const dailyNeeded = remaining / daysLeft;
      alerts.push({
        id: `goal_behind_${goal._id}`,
        type: 'info',
        icon: '📈',
        title: `Behind on Goal: ${goal.title}`,
        message: `Only ${pct.toFixed(0)}% saved for "${goal.title}" with ${daysLeft} days left. You need ₹${dailyNeeded.toFixed(0)}/day to hit the target.`,
        action: { label: 'View Goals', href: '/goals' },
        priority: 4,
      });
    } else if (pct >= 100) {
      alerts.push({
        id: `goal_done_${goal._id}`,
        type: 'success',
        icon: '🏆',
        title: `Goal Achieved: ${goal.title}`,
        message: `Congratulations! You've reached your "${goal.title}" savings goal. Time to celebrate and set a new one!`,
        action: { label: 'View Goals', href: '/goals' },
        priority: 5,
      });
    }
  });

  // ── 4. Streak alerts ──────────────────────────────────────────────────────────
  if (streak) {
    const lastLogged = streak.lastLoggedDate ? new Date(streak.lastLoggedDate) : null;
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now - 86400000).toISOString().split('T')[0];
    const lastStr = lastLogged ? lastLogged.toISOString().split('T')[0] : null;

    const loggedToday = lastStr === todayStr;
    const loggedYesterday = lastStr === yesterdayStr;

    if (!loggedToday && !loggedYesterday && streak.currentStreak >= 3) {
      alerts.push({
        id: 'streak_broken',
        type: 'danger',
        icon: '🔥',
        title: 'Streak at Risk!',
        message: `Your ${streak.currentStreak}-day streak is about to break! Log a transaction today to keep it alive.`,
        action: { label: 'Log Transaction', href: '/transactions' },
        priority: 1,
      });
    } else if (!loggedToday && streak.currentStreak >= 1) {
      alerts.push({
        id: 'log_reminder',
        type: 'info',
        icon: '📝',
        title: "Log Today's Transactions",
        message: `You haven't logged any transactions today. Keep your ${streak.currentStreak}-day streak alive and earn XP!`,
        action: { label: 'Add Transaction', href: '/transactions' },
        priority: 5,
      });
    }
  }

  // ── 5. Wallet balance alert ───────────────────────────────────────────────────
  if (wallet && wallet.balance < 100 && wallet.balance >= 0) {
    alerts.push({
      id: 'low_wallet',
      type: 'info',
      icon: '👛',
      title: 'Low Wallet Balance',
      message: `Your wallet balance is ₹${wallet.balance.toFixed(2)}. Top up to keep transactions smooth.`,
      action: { label: 'Top Up Wallet', href: '/wallet' },
      priority: 5,
    });
  }

  // ── 6. No income logged alert ─────────────────────────────────────────────────
  if (totalIncome === 0 && now.getDate() > 7) {
    alerts.push({
      id: 'no_income',
      type: 'info',
      icon: '💰',
      title: 'No Income Logged',
      message: `You haven't logged any income for ${now.toLocaleString('en-IN', { month: 'long' })}. Add your scholarships, allowance or earnings for accurate tracking.`,
      action: { label: 'Add Income', href: '/transactions' },
      priority: 5,
    });
  }

  // Sort by priority (lower = more urgent)
  alerts.sort((a, b) => a.priority - b.priority);

  return alerts;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/alerts  — premium only, returns live-computed alerts
router.get('/', protect, premiumOnly, async (req, res) => {
  try {
    const alerts = await generateAlerts(req.user._id);
    res.json({ success: true, alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/alerts/summary  — free users can see count (to upsell), not details
router.get('/summary', protect, async (req, res) => {
  try {
    if (req.user.plan !== 'premium') {
      // Return teaser count without details
      const alerts = await generateAlerts(req.user._id);
      return res.json({
        success: true,
        count: alerts.length,
        isPremium: false,
        message: `You have ${alerts.length} smart alert${alerts.length !== 1 ? 's' : ''} waiting. Upgrade to Premium to see them.`,
      });
    }
    const alerts = await generateAlerts(req.user._id);
    res.json({ success: true, alerts, count: alerts.length, isPremium: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;