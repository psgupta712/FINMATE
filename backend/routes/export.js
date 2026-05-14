const express = require('express');
const router = express.Router();
const { protect, premiumOnly } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// ─── CSV Export ───────────────────────────────────────────────────────────────
// GET /api/export/csv?month=5&year=2026
router.get('/csv', protect, premiumOnly, async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'No transactions found for this period.' });
    }

    // Build CSV manually — no extra package needed
    const monthName = start.toLocaleString('en-IN', { month: 'long' });
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (₹)', 'Payment Method'];

    const rows = transactions.map(tx => [
      new Date(tx.date).toLocaleDateString('en-IN'),
      tx.type,
      tx.category,
      `"${(tx.description || '').replace(/"/g, '""')}"`,  // escape quotes in description
      tx.amount.toFixed(2),
      tx.paymentMethod,
    ]);

    // Summary rows at the bottom
    const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const csvLines = [
      `FinMate Expense Report — ${monthName} ${year}`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `User: ${req.user.name}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      `Total Income,,,, ₹${totalIncome.toFixed(2)}`,
      `Total Expenses,,,, ₹${totalExpense.toFixed(2)}`,
      `Net Savings,,,, ₹${(totalIncome - totalExpense).toFixed(2)}`,
    ];

    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="finmate-report-${monthName.toLowerCase()}-${year}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PDF Export ───────────────────────────────────────────────────────────────
// GET /api/export/pdf?month=5&year=2026
router.get('/pdf', protect, premiumOnly, async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'No transactions found for this period.' });
    }

    const monthName   = start.toLocaleString('en-IN', { month: 'long' });
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense= transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netSavings  = totalIncome - totalExpense;

    // Category breakdown
    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Build a clean HTML page and stream it — no pdfkit needed
    // The browser's print-to-PDF handles rendering. We just return styled HTML
    // with a print stylesheet that auto-triggers printing.
    const tableRows = transactions.map(tx => `
      <tr class="${tx.type}">
        <td>${new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td><span class="badge ${tx.type}">${tx.type}</span></td>
        <td>${tx.category}</td>
        <td>${tx.description || '—'}</td>
        <td class="amount">${tx.type === 'income' ? '+' : '−'}₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>${tx.paymentMethod.toUpperCase()}</td>
      </tr>
    `).join('');

    const categoryRows = topCategories.map(([cat, amt]) => {
      const pct = ((amt / totalExpense) * 100).toFixed(1);
      return `<tr><td>${cat}</td><td>₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td>${pct}%</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>FinMate Report — ${monthName} ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .page { max-width: 820px; margin: 0 auto; padding: 32px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
  .brand { font-size: 24px; font-weight: 800; color: #6366f1; }
  .brand span { color: #1e293b; }
  .meta { text-align: right; color: #64748b; font-size: 12px; line-height: 1.8; }

  /* Summary cards */
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .card-value { font-size: 22px; font-weight: 700; }
  .green { color: #10b981; }
  .red { color: #ef4444; }
  .blue { color: #6366f1; }

  /* Section */
  .section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 12px; }
  th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  tr.income td { background: #f0fdf4; }
  tr.expense td { background: #fff; }

  .badge { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .badge.income { background: #d1fae5; color: #065f46; }
  .badge.expense { background: #fee2e2; color: #991b1b; }

  .amount { font-weight: 600; text-align: right; }
  tr.income .amount { color: #10b981; }
  tr.expense .amount { color: #ef4444; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }

  /* Print */
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none; }
  }

  /* Auto-print button */
  .print-btn { position: fixed; top: 20px; right: 20px; background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
  .print-btn:hover { background: #4f46e5; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Save as PDF</button>
<div class="page">

  <div class="header">
    <div>
      <div class="brand">Fin<span>Mate</span></div>
      <div style="color:#64748b;font-size:12px;margin-top:4px;">Personal Finance Report</div>
    </div>
    <div class="meta">
      <div><strong>${monthName} ${year}</strong></div>
      <div>Account: ${req.user.name}</div>
      <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="summary">
    <div class="card">
      <div class="card-label">Total Income</div>
      <div class="card-value green">₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Expenses</div>
      <div class="card-value red">₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Savings</div>
      <div class="card-value ${netSavings >= 0 ? 'blue' : 'red'}">₹${netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  ${topCategories.length > 0 ? `
  <div class="section-title">Spending by Category</div>
  <table>
    <thead><tr><th>Category</th><th>Amount</th><th>% of Expenses</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>
  ` : ''}

  <div class="section-title">All Transactions (${transactions.length})</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Method</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    <span>FinMate — Personal Finance for Students</span>
    <span>⭐ Premium Report</span>
  </div>

</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;