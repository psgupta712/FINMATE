'use client';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { useAuth } from '../../lib/auth';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('finMate_token') : null;

const TYPE_STYLES = {
  danger:  { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', badge: '#fee2e2', badgeText: '#991b1b', label: 'Action Required' },
  warning: { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', badge: '#fef3c7', badgeText: '#92400e', label: 'Warning' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', badge: '#dbeafe', badgeText: '#1e40af', label: 'Info' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', badge: '#d1fae5', badgeText: '#065f46', label: 'Great Job' },
};

const FILTER_TABS = ['All', 'Action Required', 'Warning', 'Info', 'Great Job'];

export default function AlertsPage() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());
  const [filter, setFilter] = useState('All');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const endpoint = isPremium ? '/alerts' : '/alerts/summary';
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        if (isPremium) {
          setAlerts(data.alerts || []);
        } else {
          setSummary(data);
        }
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(alerts.map(a => a.id)));
  const restoreAll = () => setDismissed(new Set());

  const visible = alerts.filter(a => {
    if (dismissed.has(a.id)) return false;
    if (filter === 'All') return true;
    const s = TYPE_STYLES[a.type];
    return s?.label === filter;
  });

  const counts = {
    danger:  alerts.filter(a => a.type === 'danger'  && !dismissed.has(a.id)).length,
    warning: alerts.filter(a => a.type === 'warning' && !dismissed.has(a.id)).length,
    info:    alerts.filter(a => a.type === 'info'    && !dismissed.has(a.id)).length,
    success: alerts.filter(a => a.type === 'success' && !dismissed.has(a.id)).length,
  };

  return (
    <AuthGuard>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Smart Alerts 🔔</h1>
          <p className="page-subtitle">
            {isPremium
              ? 'AI-powered financial alerts based on your real data'
              : 'Upgrade to Premium to see personalised alerts'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={fetchAlerts} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          {isPremium && dismissed.size > 0 && (
            <button className="btn btn-outline btn-sm" onClick={restoreAll}>Restore All</button>
          )}
          {isPremium && visible.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={dismissAll}>Dismiss All</button>
          )}
        </div>
      </div>

      {/* Premium gate */}
      {!isPremium ? (
        <div>
          {/* Teaser card */}
          {summary && (
            <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>🔔</div>
              <div>
                <p style={{ fontWeight: '700', color: '#92400e' }}>{summary.message}</p>
                <p style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>Unlock detailed alerts to fix issues before they hurt your finances.</p>
              </div>
            </div>
          )}

          {/* Blurred preview */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
              {[
                { type: 'danger', icon: '🚨', title: 'Budget Exceeded!', message: 'You\'ve spent ₹12,400 — ₹2,400 over your ₹10,000 budget.' },
                { type: 'warning', icon: '⚠️', title: 'Budget Running Low', message: 'You\'ve used 82% of your monthly budget. Only ₹1,800 left.' },
                { type: 'warning', icon: '🎯', title: 'Goal Deadline Near', message: 'Only 5 days left to save ₹3,000 for your Laptop goal.' },
                { type: 'info', icon: '📝', title: 'Log Today\'s Transactions', message: 'Keep your 7-day streak alive and earn XP!' },
              ].map((a, i) => (
                <AlertCard key={i} alert={a} onDismiss={() => {}} />
              ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,250,252,0.6)', borderRadius: 'var(--radius)', backdropFilter: 'blur(1px)' }}>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⭐</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Premium Feature</h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '320px' }}>
                  Smart Alerts monitor your budgets, goals, streaks, and spending patterns — and warn you before things go wrong.
                </p>
                <Link href="/subscription" className="btn btn-primary">Upgrade for ₹99/month</Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'danger', icon: '🚨', label: 'Critical', color: '#ef4444', bg: '#fef2f2' },
                { key: 'warning', icon: '⚠️', label: 'Warnings', color: '#f59e0b', bg: '#fffbeb' },
                { key: 'info', icon: 'ℹ️', label: 'Info', color: '#3b82f6', bg: '#eff6ff' },
                { key: 'success', icon: '✅', label: 'Positive', color: '#10b981', bg: '#f0fdf4' },
              ].map(s => (
                <div key={s.key} onClick={() => setFilter(s.key === 'danger' ? 'Action Required' : s.key === 'warning' ? 'Warning' : s.key === 'info' ? 'Info' : 'Great Job')}
                  style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{counts[s.key]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '4px', width: 'fit-content' }}>
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={filter === tab ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
                style={{ border: 'none', fontSize: '0.8rem' }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Alert list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>Analysing your finances...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                {dismissed.size > 0 && alerts.length > 0 ? '✅' : '🎉'}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>
                {dismissed.size > 0 && alerts.length > 0 ? 'All caught up!' : 'No alerts right now!'}
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                {dismissed.size > 0 && alerts.length > 0
                  ? `${dismissed.size} alert${dismissed.size > 1 ? 's' : ''} dismissed. `
                  : "Your finances look healthy. Keep up the great work! "}
                {dismissed.size > 0 && (
                  <button onClick={restoreAll} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
                    Restore dismissed
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {visible.map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />
              ))}
            </div>
          )}

          {/* Info footer */}
          <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span>Smart Alerts are generated live from your real financial data. They refresh every time you visit this page or click Refresh.</span>
          </div>
        </>
      )}
    </AuthGuard>
  );
}

function AlertCard({ alert, onDismiss }) {
  const s = TYPE_STYLES[alert.type] || TYPE_STYLES.info;
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderLeft: `4px solid ${s.accent}`,
      borderRadius: 'var(--radius)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      transition: 'all 0.2s',
      animation: 'alertFadeIn 0.3s ease',
    }}>
      <div style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: '1px' }}>{alert.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <h3 style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>{alert.title}</h3>
          <span style={{ background: s.badge, color: s.badgeText, padding: '1px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '600' }}>
            {s.label}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: '1.5' }}>{alert.message}</p>
        {alert.action && (
          <Link href={alert.action.href} style={{
            display: 'inline-block',
            marginTop: '0.625rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: s.accent,
            textDecoration: 'none',
          }}>
            {alert.action.label} →
          </Link>
        )}
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(alert.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: '1rem', flexShrink: 0,
          padding: '0 2px', lineHeight: 1, transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.target.style.color = 'var(--text)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
          title="Dismiss"
        >✕</button>
      )}
      <style>{`@keyframes alertFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}