'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { budgetAPI, transactionsAPI } from '../../lib/api';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', limit: 3000 },
  { name: 'Transport', limit: 1000 },
  { name: 'Education', limit: 2000 },
  { name: 'Entertainment', limit: 1000 },
  { name: 'Shopping', limit: 1500 },
  { name: 'Health', limit: 500 },
  { name: 'Utilities', limit: 500 },
  { name: 'Other', limit: 1000 },
];

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budget, setBudget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ totalBudget: 10000, categories: DEFAULT_CATEGORIES });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetData, summaryData] = await Promise.all([
        budgetAPI.get({ month, year }),
        transactionsAPI.summary({ month, year }),
      ]);
      setBudget(budgetData.budget);
      setSummary(summaryData);
      if (budgetData.budget) {
        setForm({ totalBudget: budgetData.budget.totalBudget, categories: budgetData.budget.categories });
      }
    } catch (e) { showToast('Failed to load budget'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await budgetAPI.set({ month, year, totalBudget: Number(form.totalBudget), categories: form.categories });
      showToast('✅ Budget saved!');
      setEditing(false);
      fetchData();
    } catch (err) { showToast(err.message); }
    finally { setSaving(false); }
  };

  const updateCatLimit = (i, val) => {
    const cats = [...form.categories];
    cats[i] = { ...cats[i], limit: Number(val) };
    setForm(f => ({ ...f, categories: cats }));
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const spentByCategory = summary?.categoryBreakdown || {};
  const totalSpent = summary?.totalExpense || 0;
  const budgetUsedPct = budget ? Math.min(100, (totalSpent / budget.totalBudget) * 100) : 0;

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Budget 📋</h1>
          <p className="page-subtitle">Plan and monitor your spending limits</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="form-input" style={{ width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-input" style={{ width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setEditing(!editing)}>
            {editing ? '✕ Cancel' : budget ? '✏️ Edit' : '+ Create Budget'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem' }}>Loading...</p>
      ) : (
        <>
          {/* Edit Form */}
          {editing && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Set Budget for {MONTHS[month - 1]} {year}</h3>
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Total Monthly Budget (₹)</label>
                  <input className="form-input" type="number" value={form.totalBudget} onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))} required />
                </div>
                <h4 style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-2)' }}>Category Limits</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {form.categories.map((cat, i) => (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.85rem', width: '130px', flexShrink: 0 }}>{cat.name}</label>
                      <input className="form-input" type="number" value={cat.limit} onChange={e => updateCatLimit(i, e.target.value)} style={{ width: '120px' }} />
                    </div>
                  ))}
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : '💾 Save Budget'}</button>
              </form>
            </div>
          )}

          {!budget && !editing ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No budget set for {MONTHS[month - 1]} {year}</h3>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Create a budget to track your spending against limits.</p>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>+ Create Budget</button>
            </div>
          ) : budget && (
            <>
              {/* Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="stat-card"><div className="stat-label">Total Budget</div><div className="stat-value blue">₹{budget.totalBudget.toLocaleString()}</div></div>
                <div className="stat-card"><div className="stat-label">Spent So Far</div><div className={`stat-value ${budgetUsedPct >= 90 ? 'red' : 'red'}`}>₹{totalSpent.toLocaleString()}</div></div>
                <div className="stat-card"><div className="stat-label">Remaining</div><div className={`stat-value ${budget.totalBudget - totalSpent >= 0 ? 'green' : 'red'}`}>₹{(budget.totalBudget - totalSpent).toLocaleString()}</div></div>
              </div>

              {/* Overall progress */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '600' }}>Overall Budget Used</span>
                  <span style={{ color: budgetUsedPct >= 90 ? 'var(--danger)' : 'var(--text-2)', fontWeight: '600' }}>{budgetUsedPct.toFixed(0)}%</span>
                </div>
                <div className="progress-bar" style={{ height: '12px' }}>
                  <div className={`progress-fill ${budgetUsedPct >= 90 ? 'danger' : budgetUsedPct >= 70 ? 'warning' : 'success'}`} style={{ width: `${budgetUsedPct}%` }} />
                </div>
                {budgetUsedPct >= 90 && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginTop: '0.5rem' }}>⚠️ Warning: You've used over 90% of your budget!</p>}
              </div>

              {/* Category breakdown */}
              <div className="card">
                <h3 style={{ fontWeight: '600', marginBottom: '1.25rem' }}>Category Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {budget.categories.map((cat) => {
                    const spent = spentByCategory[cat.name] || 0;
                    const pct = cat.limit > 0 ? Math.min(100, (spent / cat.limit) * 100) : 0;
                    const over = spent > cat.limit;
                    return (
                      <div key={cat.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '500' }}>{cat.name}</span>
                          <span style={{ color: over ? 'var(--danger)' : 'var(--text-2)' }}>
                            ₹{spent.toLocaleString()} / ₹{cat.limit.toLocaleString()}
                            {over && ' ⚠️'}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-fill ${over ? 'danger' : pct >= 80 ? 'warning' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}
