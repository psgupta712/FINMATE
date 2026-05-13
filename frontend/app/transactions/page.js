'use client';
import { useEffect, useRef, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { transactionsAPI } from '../../lib/api';

const CATEGORIES = ['Food & Dining','Transport','Education','Entertainment','Shopping','Health','Utilities','Rent','Subscription','Investment','Freelance','Scholarship','Part-time Job','Family Support','Refund','Other'];
const PAYMENT_METHODS = ['cash','upi','card','wallet','netbanking','other'];

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: 'Other',
  description: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'upi',
};

// ─── Receipt Scanner Modal ────────────────────────────────────────────────────
function ReceiptScannerModal({ onClose, onFill }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Please use an image under 5MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!preview) return;
    setScanning(true);
    setError('');
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('finMate_token');
      const res = await fetch(`${BASE_URL}/receipt/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: preview }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onFill(data.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Scan failed. Please enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '1.75rem', width: '100%', maxWidth: '460px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>📷 Scan Receipt</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1 }}>✕</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
          Upload a photo of your receipt or bill. AI will extract the amount, date, and category automatically.
        </p>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${preview ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '1rem',
            background: preview ? 'var(--primary-light)' : 'var(--surface-2)',
            transition: 'all 0.2s',
            minHeight: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Receipt preview"
              style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
            />
          ) : (
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
              <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: '500' }}>Click to upload receipt image</p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '4px' }}>JPG, PNG, WEBP · Max 5MB</p>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', fontSize: '0.83rem', marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleScan}
            disabled={!preview || scanning}
          >
            {scanning ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Scanning…
              </span>
            ) : '✨ Scan & Auto-fill'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState({ type: '', category: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

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

  // Called by scanner modal after successful scan
  const handleScanFill = (scanned) => {
    setForm({
      type: 'expense',
      amount: scanned.amount ? String(scanned.amount) : '',
      category: scanned.category || 'Other',
      description: scanned.description || '',
      date: scanned.date || new Date().toISOString().split('T')[0],
      paymentMethod: scanned.paymentMethod || 'other',
    });
    setShowForm(true);

    const confidenceMsg = scanned.confidence === 'low'
      ? '⚠️ Low confidence scan — please review the details before saving.'
      : '✅ Receipt scanned! Please verify and save.';
    showToast(confidenceMsg);
  };

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
      {/* Scanner Modal */}
      {showScanner && (
        <ReceiptScannerModal
          onClose={() => setShowScanner(false)}
          onFill={handleScanFill}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions 💳</h1>
          <p className="page-subtitle">Track all your income and expenses</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowScanner(true)}
            title="Scan a receipt to auto-fill"
          >
            📷 Scan Receipt
          </button>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); }}>
            {showForm ? '✕ Cancel' : '+ Add Transaction'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Income</div><div className="stat-value green">₹{totalIncome.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value red">₹{totalExpense.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Net</div><div className={`stat-value ${totalIncome - totalExpense >= 0 ? 'green' : 'red'}`}>₹{(totalIncome - totalExpense).toLocaleString()}</div></div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Add Transaction</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowScanner(true)}
              style={{ fontSize: '0.8rem' }}
            >
              📷 Scan Receipt Instead
            </button>
          </div>

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

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>No transactions yet</p>
            <p style={{ fontSize: '0.875rem' }}>
              Add one manually or{' '}
              <button onClick={() => setShowScanner(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', padding: 0 }}>
                scan a receipt 📷
              </button>
            </p>
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
                  <td style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description || '—'}
                  </td>
                  <td>
                    <span style={{ background: 'var(--surface-2)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: '500' }}>
                      {tx.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{tx.paymentMethod}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.type === 'income' ? '+' : '−'}₹{tx.amount.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(tx._id)} className="btn btn-sm" style={{ color: 'var(--danger)', border: 'none', background: 'none', padding: '4px 8px' }}>
                      🗑️
                    </button>
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