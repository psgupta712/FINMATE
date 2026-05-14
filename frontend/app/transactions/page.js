'use client';
import { useEffect, useState, useRef } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { transactionsAPI } from '../../lib/api';
import BadgeToast from '../../components/BadgeToast';

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Education', 'Entertainment',
  'Shopping', 'Health', 'Utilities', 'Rent', 'Subscription',
  'Investment', 'Freelance', 'Scholarship', 'Part-time Job',
  'Family Support', 'Refund', 'Other',
];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'wallet', 'netbanking', 'other'];
const EMPTY_FORM = {
  type: 'expense', amount: '', category: 'Other',
  description: '', date: new Date().toISOString().split('T')[0],
  paymentMethod: 'other', isRecurring: false, tags: '',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [newBadges, setNewBadges] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', category: '', startDate: '', endDate: '' });
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchTransactions = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const data = await transactionsAPI.list(params);
      setTransactions(data.transactions);
      setTotal(data.total);
      setPage(p);
    } catch {
      showToast('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(1); }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return showToast('Enter a valid amount');
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      const data = await transactionsAPI.add(payload);
      if (data.newBadges?.length) setNewBadges(data.newBadges);
      showToast('✅ Transaction added!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchTransactions(1);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionsAPI.delete(id);
      showToast('Deleted');
      fetchTransactions(page);
    } catch {
      showToast('Delete failed');
    }
  };

  const handleReceiptScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target.result;
          const token = localStorage.getItem('finMate_token');
          const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const res = await fetch(`${BASE_URL}/receipt/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ imageBase64: base64 }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.message);
          const { amount, date, description, category, paymentMethod } = data.data;
          setForm(f => ({ ...f, amount: String(amount), date, description, category, paymentMethod }));
          setShowForm(true);
          showToast('📷 Receipt scanned! Review and confirm.');
        } catch (err) {
          showToast(`Scan failed: ${err.message}`);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setScanning(false);
      showToast('Could not read file');
    }
    e.target.value = '';
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const totalPages = Math.ceil(total / 20);

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions 💳</h1>
          <p className="page-subtitle">{total} transactions total</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleReceiptScan}
          />
          <button
            className="btn btn-outline"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
          >
            {scanning ? '⏳ Scanning...' : '📷 Scan Receipt'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add Transaction'}
          </button>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>New Transaction</h3>

          {/* Type toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '4px', width: 'fit-content' }}>
            {['expense', 'income'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={form.type === t ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
                style={{ textTransform: 'capitalize', border: 'none' }}
              >
                {t === 'expense' ? '📉 Expense' : '📈 Income'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                className="form-input"
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required min="0.01" step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="What was this for?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                placeholder="e.g. college, food"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="recurring"
                checked={form.isRecurring}
                onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
              />
              <label htmlFor="recurring" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Recurring transaction</label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Transaction'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="form-label">Category</label>
            <select className="form-input" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input className="form-input" type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input className="form-input" type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        {(filters.type || filters.category || filters.startDate || filters.endDate) && (
          <button className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setFilters({ type: '', category: '', startDate: '', endDate: '' })}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Transaction List */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No transactions found</h3>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Start by adding your first transaction.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Transaction</button>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx._id}>
                    <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type === 'income' ? 'success' : 'danger'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{tx.category}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{tx.description || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{tx.paymentMethod}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.type === 'income' ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--danger)', border: 'none', padding: '2px 6px' }}
                        onClick={() => handleDelete(tx._id)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => fetchTransactions(page - 1)}>← Prev</button>
                <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-2)' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => fetchTransactions(page + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      <BadgeToast badges={newBadges} onDone={() => setNewBadges([])} />
      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}