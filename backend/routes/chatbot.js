const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Wallet = require('../models/Wallet');
const Budget = require('../models/Budget');

// ─── Rule-based fallback (free users) ────────────────────────────────────────

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

const ruleBasedReply = (message, { totalIncome, totalExpense, savings, savingsRate, catMap, topCategory, goals, wallet, user }) => {
  const lower = message.toLowerCase();

  const intent = detectIntent(message);
  if (intent) return { response: KNOWLEDGE_BASE[intent], type: 'education' };

  if (lower.includes('spend') || lower.includes('spent') || lower.includes('expense')) {
    let reply = `This month you've spent ₹${totalExpense.toFixed(2)}.`;
    if (topCategory) reply += ` Your biggest expense category is **${topCategory[0]}** (₹${topCategory[1].toFixed(2)}).`;
    if (savings < 0) reply += ` ⚠️ You're overspending by ₹${Math.abs(savings).toFixed(2)}!`;
    else reply += ` You've saved ₹${savings.toFixed(2)} (${savingsRate}% savings rate). ${Number(savingsRate) >= 20 ? '🎉 Great job!' : 'Aim for 20%+!'}`;
    return { response: reply, type: 'insight' };
  }

  if (lower.includes('income') || lower.includes('earn')) {
    return { response: `This month your total income is ₹${totalIncome.toFixed(2)}.${totalIncome === 0 ? ' Add your income sources to get better insights!' : ''}`, type: 'insight' };
  }

  if (lower.includes('goal') || lower.includes('saving goal')) {
    if (goals.length === 0) return { response: `You have no active savings goals. Create one to stay motivated!`, type: 'insight' };
    const goalList = goals.map(g => `• ${g.icon} ${g.title}: ₹${g.savedAmount}/${g.targetAmount} (${((g.savedAmount / g.targetAmount) * 100).toFixed(0)}%)`).join('\n');
    return { response: `Your active goals:\n${goalList}`, type: 'insight' };
  }

  if (lower.includes('balance')) {
    return { response: `Your wallet balance is ₹${wallet?.balance?.toFixed(2) || '0.00'}.`, type: 'insight' };
  }

  if (lower.includes('tip') || lower.includes('advice') || lower.includes('suggest')) {
    const tips = [
      `📊 Your savings rate this month is ${savingsRate}%. ${Number(savingsRate) >= 20 ? 'Excellent! Keep it up.' : 'Aim for 20% — that means saving ₹' + (totalIncome * 0.2).toFixed(0) + '/month.'}`,
      topCategory ? `🛒 You spent most on ${topCategory[0]} (₹${topCategory[1].toFixed(2)}). Could you reduce this by 10%?` : null,
      goals.length > 0 ? `🎯 You have ${goals.length} active goal(s). Stay consistent!` : `💡 Create a savings goal to stay motivated!`,
      user.plan === 'free' ? `⭐ Upgrade to Premium for real AI-powered insights — just ₹99/month!` : null,
    ].filter(Boolean);
    return { response: tips.join('\n\n'), type: 'advice' };
  }

  if (lower.includes('premium') || lower.includes('upgrade') || lower.includes('plan')) {
    return {
      response: `**Premium Plan — ₹99/month** unlocks:\n✅ AI-powered financial insights\n✅ Unlimited savings goals\n✅ PDF & CSV reports\n✅ Smart spending alerts\n✅ Priority support\n\nUpgrade from the Subscription page!`,
      type: 'upsell',
    };
  }

  return {
    response: `I can help you with:\n• "How much did I spend this month?"\n• "What are my savings goals?"\n• "Explain UPI / credit cards / SIP"\n• "Give me money saving tips"\n• "What's my wallet balance?"`,
    type: 'default',
  };
};

// ─── Real AI reply via Groq (premium users) ──────────────────────────────────

const groqAIReply = async (message, context) => {
  const { totalIncome, totalExpense, savings, savingsRate, catMap, goals, wallet, budget, userName } = context;

  const categoryList = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  - ${cat}: ₹${amt.toFixed(2)}`)
    .join('\n');

  const goalList = goals.map(g =>
    `  - ${g.title}: saved ₹${g.savedAmount} of ₹${g.targetAmount} (${((g.savedAmount / g.targetAmount) * 100).toFixed(0)}% complete, deadline: ${new Date(g.deadline).toLocaleDateString('en-IN')})`
  ).join('\n');

  const systemPrompt = `You are FinMate AI, a smart and friendly personal finance assistant for Indian college students.
You have access to the user's real financial data below. Use it to give precise, personalised advice.
Keep responses concise (under 150 words), practical, and encouraging. Use ₹ for currency. Use bullet points where helpful.
Never make up numbers — only use the data provided.

USER: ${userName}
THIS MONTH'S DATA:
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Net Savings: ₹${savings.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Wallet Balance: ₹${wallet?.balance?.toFixed(2) || '0.00'}
${categoryList ? `- Spending by category:\n${categoryList}` : '- No expense categories yet'}
${goalList ? `- Savings goals:\n${goalList}` : '- No active savings goals'}
${budget ? `- Monthly budget set: ₹${budget.totalBudget}` : '- No monthly budget set'}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
};

// ─── Route ────────────────────────────────────────────────────────────────────

// POST /api/chatbot/message
router.post('/message', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch user's financial context
    const [transactions, goals, wallet, budget] = await Promise.all([
      Transaction.find({ user: req.user._id, date: { $gte: startOfMonth } }),
      Goal.find({ user: req.user._id, isCompleted: false }),
      Wallet.findOne({ user: req.user._id }),
      Budget.findOne({ user: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() }),
    ]);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

    const context = { totalIncome, totalExpense, savings, savingsRate, catMap, topCategory, goals, wallet, budget, user: req.user, userName: req.user.name };

    // Premium users → real Groq AI
    if (req.user.plan === 'premium') {
      try {
        const aiResponse = await groqAIReply(message, context);
        return res.json({ success: true, response: aiResponse, type: 'ai', isPremium: true });
      } catch (aiErr) {
        console.error('Groq AI error, falling back to rule-based:', aiErr.message);
        // Fall through to rule-based on AI failure
      }
    }

    // Free users → rule-based
    const { response, type } = ruleBasedReply(message, context);
    res.json({ success: true, response, type, isPremium: false });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;