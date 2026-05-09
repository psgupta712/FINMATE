const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Wallet = require('../models/Wallet');

// Knowledge base for financial education
const KNOWLEDGE_BASE = {
  upi: `UPI (Unified Payments Interface) is India's real-time payment system developed by NPCI. It allows instant money transfers 24/7 using a Virtual Payment Address (VPA) like yourname@upi. Apps like GPay, PhonePe, and Paytm use UPI. It's FREE, instant, and requires only a smartphone + bank account.`,
  credit_card: `A credit card lets you borrow money from the bank up to a limit and pay later. Key tips for students: Pay the FULL bill every month to avoid 36-42% annual interest. Use it for building credit history. Never use more than 30% of your credit limit. Most student cards offer rewards on spending.`,
  debit_card: `A debit card spends money directly from your bank account. It's the safest card for students since you can only spend what you have. There's no interest, no debt risk. Perfect for daily expenses. Enable transaction alerts to track spending in real time.`,
  wallet: `Digital wallets (Paytm, PhonePe, Amazon Pay) store money digitally for quick payments. Benefits: Instant transfers, cashback offers, no need to carry cash. Tip: Keep only what you need in wallets — the rest in savings for interest.`,
  saving: `The 50-30-20 rule for students: 50% on needs (food, rent, transport), 30% on wants (entertainment, shopping), 20% on savings. Even saving ₹500/month at 7% returns = ₹72,000 in 10 years through compounding.`,
  investment: `Start investing early! Options for students: 1) SIP in mutual funds (start with ₹500/month) 2) Digital Gold 3) RD/FD for safe returns. Avoid stock market speculation without knowledge. Use apps like Zerodha Varsity to learn first.`,
  budget: `Budgeting steps: 1) Track all income (scholarship, part-time, family) 2) List fixed expenses (rent, fees) 3) Set limits for variable expenses 4) Always allocate for savings FIRST before spending. Review weekly.`,
  emergency_fund: `Every student needs an emergency fund covering 1-2 months of expenses. Start with ₹5000, grow to ₹20,000. Keep it in a high-interest savings account, NOT in your regular account (to avoid temptation). This covers medical emergencies, sudden travel, or job loss.`,
};

const detectIntent = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepay')) return 'upi';
  if (lower.includes('credit card') || lower.includes('credit')) return 'credit_card';
  if (lower.includes('debit')) return 'debit_card';
  if (lower.includes('wallet') || lower.includes('paytm')) return 'wallet';
  if (lower.includes('save') || lower.includes('saving') || lower.includes('50-30-20')) return 'saving';
  if (lower.includes('invest') || lower.includes('mutual fund') || lower.includes('sip')) return 'investment';
  if (lower.includes('budget') || lower.includes('plan')) return 'budget';
  if (lower.includes('emergency') || lower.includes('fund')) return 'emergency_fund';
  return null;
};

// POST /api/chatbot/message
router.post('/message', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    // Get user's financial context
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [transactions, goals, wallet] = await Promise.all([
      Transaction.find({ user: req.user._id, date: { $gte: startOfMonth } }),
      Goal.find({ user: req.user._id, isCompleted: false }),
      Wallet.findOne({ user: req.user._id }),
    ]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

    // Category breakdown
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

    // Check for knowledge query
    const intent = detectIntent(message);
    if (intent) {
      return res.json({
        success: true,
        response: KNOWLEDGE_BASE[intent],
        type: 'education',
      });
    }

    // Financial summary query
    const lower = message.toLowerCase();
    if (lower.includes('spend') || lower.includes('spent') || lower.includes('expense')) {
      let reply = `This month you've spent ₹${totalExpense.toFixed(2)}.`;
      if (topCategory) reply += ` Your biggest expense category is **${topCategory[0]}** (₹${topCategory[1].toFixed(2)}).`;
      if (savings < 0) reply += ` ⚠️ You're overspending by ₹${Math.abs(savings).toFixed(2)}! Consider cutting ${topCategory?.[0] || 'discretionary'} expenses.`;
      else reply += ` You've saved ₹${savings.toFixed(2)} (${savingsRate}% savings rate). ${Number(savingsRate) >= 20 ? '🎉 Great job!' : 'Aim for 20%+!'}`;
      return res.json({ success: true, response: reply, type: 'insight' });
    }

    if (lower.includes('income') || lower.includes('earn')) {
      return res.json({ success: true, response: `This month your total income is ₹${totalIncome.toFixed(2)}.${totalIncome === 0 ? ' Add your income sources to get better insights!' : ''}`, type: 'insight' });
    }

    if (lower.includes('goal') || lower.includes('saving goal')) {
      if (goals.length === 0) return res.json({ success: true, response: `You have no active savings goals. Create one to stay motivated! For example: "Save ₹10,000 for a new laptop in 3 months."`, type: 'insight' });
      const goalList = goals.map(g => `• ${g.icon} ${g.title}: ₹${g.savedAmount}/${g.targetAmount} (${((g.savedAmount / g.targetAmount) * 100).toFixed(0)}%)`).join('\n');
      return res.json({ success: true, response: `Your active goals:\n${goalList}`, type: 'insight' });
    }

    if (lower.includes('wallet') || lower.includes('balance')) {
      return res.json({ success: true, response: `Your wallet balance is ₹${wallet?.balance?.toFixed(2) || '0.00'}. Add money via Razorpay to top up!`, type: 'insight' });
    }

    if (lower.includes('tip') || lower.includes('advice') || lower.includes('suggest')) {
      const tips = [
        `📊 Your savings rate this month is ${savingsRate}%. ${Number(savingsRate) >= 20 ? 'Excellent! Keep it up.' : 'Aim for 20% — that means saving ₹' + (totalIncome * 0.2).toFixed(0) + '/month.'}`,
        topCategory ? `🛒 You spent most on ${topCategory[0]} (₹${topCategory[1].toFixed(2)}). Could you reduce this by 10%?` : null,
        goals.length > 0 ? `🎯 You have ${goals.length} active goal(s). Stay consistent!` : `💡 Create a savings goal to stay motivated!`,
        req.user.plan === 'free' ? `⭐ Upgrade to Premium for AI-powered insights, PDF reports, and smart alerts — just ₹99/month!` : null,
      ].filter(Boolean);
      return res.json({ success: true, response: tips.join('\n\n'), type: 'advice' });
    }

    if (lower.includes('premium') || lower.includes('upgrade') || lower.includes('plan')) {
      return res.json({
        success: true,
        response: `**Premium Plan — ₹99/month** unlocks:\n✅ AI-powered financial insights\n✅ Unlimited savings goals\n✅ PDF & CSV reports\n✅ Smart spending alerts\n✅ Priority support\n\nUpgrade from the Subscription page!`,
        type: 'upsell',
      });
    }

    // Default helpful response
    const defaultResponses = [
      `I can help you with:\n• "How much did I spend this month?"\n• "What are my savings goals?"\n• "Explain UPI / credit cards / SIP"\n• "Give me money saving tips"\n• "What's my wallet balance?"`,
    ];
    res.json({ success: true, response: defaultResponses[0], type: 'default' });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
