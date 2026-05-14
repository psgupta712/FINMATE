'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { dashboardAPI } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import AlertBell from '../../components/AlertBell';
import Link from 'next/link';

const CATEGORY_COLORS = {
  'Food & Dining': '#f59e0b', 'Transport': '#6366f1', 'Education': '#06b6d4',
  'Entertainment': '#ec4899', 'Shopping': '#8b5cf6', 'Health': '#10b981',
  'Utilities': '#64748b', 'Rent': '#ef4444', 'Other': '#94a3b8',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AuthGuard>
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-2)' }}>Loading dashboard...</div>
    </AuthGuard>
  );

  const { summary = {}, categoryBreakdown = {}, monthlyTrend = [], goals = {}, recentTransactions = [], subscription = {} } = data || {};
  const maxTrend = Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expense)), 1);

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your financial overview for this month</p>
        </div>

        {/* 🔔 Bell + Add Transaction side by side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertBell isPremium={user?.plan === 'premium'} />
          <Link href="/transactions" className="btn btn-primary">+ Add Transaction</Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value green">₹{(summary.totalIncome || 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '4px' }}>This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value red">₹{(summary.totalExpense || 0).toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '4px' }}>This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Savings</div>
          <div className={`stat-value ${(summary.savings || 0) >= 0 ? 'green' : 'red'}`}>
            ₹{(summary.savings || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '4px' }}>
            {summary.savingsRate || 0}% savings rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Wallet Balance</div>
          <div className="stat-value blue">₹{(summary.walletBalance || 0).toLocaleString()}</div>
          <Link href="/wallet" style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>Top up →</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Monthly Trend */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.25rem' }}>Monthly Trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
            {monthlyTrend.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                  <div style={{ width: '40%', background: '#10b981', borderRadius: '3px 3px 0 0', height: `${(m.income / maxTrend) * 110}px`, minHeight: '2px' }} />
                  <div style={{ width: '40%', background: '#ef4444', borderRadius: '3px 3px 0 0', height: `${(m.expense / maxTrend) * 110}px`, minHeight: '2px' }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{m.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }} /> Income</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', display: 'inline-block' }} /> Expense</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.25rem' }}>Spending by Category</h3>
          {Object.keys(categoryBreakdown).length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No expenses tracked yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, amt]) => {
                  const total = summary.totalExpense || 1;
                  const pct = ((amt / total) * 100).toFixed(0);
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>{cat}</span>
                        <span style={{ fontWeight: '600' }}>₹{amt.toLocaleString()} <span style={{ color: 'var(--text-3)', fontWeight: '400' }}>({pct}%)</span></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] || '#6366f1' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Transactions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Recent Transactions</h3>
            <Link href="/transactions" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>View all →</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No transactions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTransactions.map(tx => (
                <div key={tx._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tx.type === 'income' ? '#d1fae5' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {tx.type === 'income' ? '📈' : '📉'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{tx.description || tx.category}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Savings Goals */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Savings Goals</h3>
            <Link href="/goals" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Manage →</Link>
          </div>
          {goals.active?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No active goals. <Link href="/goals" style={{ color: 'var(--primary)' }}>Create one!</Link></p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {goals.active?.slice(0, 3).map(goal => {
                const pct = Math.min(100, ((goal.savedAmount / goal.targetAmount) * 100)).toFixed(0);
                return (
                  <div key={goal._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span>{goal.icon} {goal.title}</span>
                      <span style={{ color: 'var(--text-3)' }}>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${pct >= 100 ? 'success' : pct >= 60 ? '' : 'warning'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>
                      <span>₹{goal.savedAmount.toLocaleString()} saved</span>
                      <span>₹{goal.targetAmount.toLocaleString()} target</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Premium upsell */}
      {subscription.plan === 'free' && (
        <div style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: 'white', marginBottom: '4px', fontSize: '1rem' }}>Upgrade to Premium ⭐</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>AI insights, PDF reports & smart alerts — just ₹99/month</p>
          </div>
          <Link href="/subscription" className="btn" style={{ background: 'white', color: 'var(--primary)', fontWeight: '600' }}>Upgrade Now</Link>
        </div>
      )}
    </AuthGuard>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}