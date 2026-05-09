'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { goalsAPI } from '../../lib/api';

const GOAL_CATEGORIES = ['Emergency Fund','Laptop','Trip','Course','Gadget','Books','Other'];
const ICONS = ['🎯','💻','✈️','📚','🎮','📱','🏦','🏋️','🎸','🚗'];
const EMPTY_FORM = { title: '', targetAmount: '', deadline: '', category: 'Other', icon: '🎯' };

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [addSavings, setAddSavings] = useState({ goalId: null, amount: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchGoals = () => {
    goalsAPI.list()
      .then(d => setGoals(d.goals))
      .catch(() => showToast('Failed to load goals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount || !form.deadline) return showToast('Fill all required fields');
    setSaving(true);
    try {
      await goalsAPI.create({ ...form, targetAmount: Number(form.targetAmount) });
      showToast('🎯 Goal created!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchGoals();
    } catch (err) { showToast(err.message); }
    finally { setSaving(false); }
  };

  const handleAddSavings = async (goalId) => {
    const amt = Number(addSavings.amount);
    if (!amt || amt <= 0) return showToast('Enter valid amount');
    try {
      await goalsAPI.addSavings(goalId, amt);
      showToast('💰 Savings added!');
      setAddSavings({ goalId: null, amount: '' });
      fetchGoals();
    } catch (err) { showToast(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await goalsAPI.delete(id); fetchGoals(); } catch (e) { showToast('Delete failed'); }
  };

  const active = goals.filter(g => !g.isCompleted);
  const completed = goals.filter(g => g.isCompleted);

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals 🎯</h1>
          <p className="page-subtitle">Set targets and track your progress</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Goal'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-label">Active Goals</div><div className="stat-value blue">{active.length}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value green">{completed.length}</div></div>
        <div className="stat-card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value blue">₹{goals.reduce((s, g) => s + g.savedAmount, 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Create New Goal</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Goal Title *</label>
              <input className="form-input" placeholder="e.g. New Laptop" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Target Amount (₹) *</label>
              <input className="form-input" type="number" placeholder="50000" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} required min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline *</label>
              <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {GOAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Choose Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ICONS.map(icon => (
                  <button type="button" key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    style={{ width: '40px', height: '40px', border: `2px solid ${form.icon === icon ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: form.icon === icon ? 'var(--primary-light)' : 'white', cursor: 'pointer', fontSize: '18px' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : '🎯 Create Goal'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Active Goals */}
      {loading ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem' }}>Loading goals...</p>
      ) : active.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No active goals yet!</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Create your first savings goal to start building your financial future.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create First Goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {active.map(goal => {
            const pct = Math.min(100, ((goal.savedAmount / goal.targetAmount) * 100));
            const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const progressColor = pct >= 75 ? 'success' : pct >= 40 ? '' : 'warning';

            return (
              <div key={goal._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '2rem' }}>{goal.icon}</div>
                    <div>
                      <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>{goal.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{goal.category}</span>
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'transparent', padding: '2px 6px' }} onClick={() => handleDelete(goal._id)}>🗑</button>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600' }}>₹{goal.savedAmount.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-3)' }}>of ₹{goal.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${progressColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
                    <span>{pct.toFixed(0)}% complete</span>
                    <span>{daysLeft > 0 ? `${daysLeft} days left` : '⚠️ Overdue'}</span>
                  </div>
                </div>

                {addSavings.goalId === goal._id ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="form-input" type="number" placeholder="Amount ₹" value={addSavings.amount} onChange={e => setAddSavings(s => ({ ...s, amount: e.target.value }))} style={{ flex: 1 }} autoFocus />
                    <button className="btn btn-success btn-sm" onClick={() => handleAddSavings(goal._id)}>Add</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setAddSavings({ goalId: null, amount: '' })}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => setAddSavings({ goalId: goal._id, amount: '' })}>
                    + Add Savings
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-2)' }}>✅ Completed Goals</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {completed.map(goal => (
              <div key={goal._id} className="card" style={{ opacity: 0.7, borderColor: 'var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '1.75rem' }}>{goal.icon}</div>
                  <div>
                    <h3 style={{ fontWeight: '600', fontSize: '0.95rem' }}>{goal.title}</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '600' }}>
                      🎉 ₹{goal.targetAmount.toLocaleString()} saved!
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}
