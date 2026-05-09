'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { transactionsAPI } from '../../lib/api';

const CATEGORIES = ['Food & Dining','Transport','Education','Entertainment','Shopping','Health','Utilities','Rent','Subscription','Investment','Freelance','Scholarship','Part-time Job','Family Support','Refund','Other'];
const PAYMENT_METHODS = ['cash','upi','card','wallet','netbanking','other'];

const EMPTY_FORM = { type: 'expense', amount: '', category: 'Other', description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'upi' };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState({ type: '', category: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchTx = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type) params.type = filter.type;
      if (filter.category) params.category = filter.category;
      const data = await transactionsAPI.list(params);
      setTransactions(data.transactions);
    } catch (e) { showToast('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTx(); }, [filter]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return showToast('Enter a valid amount');
    setSaving(true);
    try {
      await transactionsAPI.add({ ...form, amount: Number(form.amount) });
      showToast('✅ Transaction added!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchTx();
    } catch (err) { showToast(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await transactionsAPI.delete(id); fetchTx(); showToast('Deleted'); } catch (e) { showToast('Delete failed'); }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions 💳</h1>
          <p className="page-subtitle">Track all your income and expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Income</div><div className="stat-value green">₹{totalIncome.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value red">₹{totalExpense.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Net</div><div className={`stat-value ${totalIncome - totalExpense >= 0 ? 'green' : 'red'}`}>₹{(totalIncome - totalExpense).toLocaleString()}</div></div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>Add New Transaction</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0.01" step="0.01" required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="e.g. Lunch at canteen" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : '✅ Save Transaction'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select className="form-input" style={{ width: 'auto' }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p>No transactions found. Add your first one!</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx._id}>
                  <td style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td>{tx.description || '—'}</td>
                  <td><span style={{ background: 'var(--surface-2)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem' }}>{tx.category}</span></td>
                  <td style={{ color: 'var(--text-3)', textTransform: 'uppercase', fontSize: '0.78rem' }}>{tx.paymentMethod}</td>
                  <td style={{ fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </td>
                  <td>
                    <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => handleDelete(tx._id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}
