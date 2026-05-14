'use client';
import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('finMate_token') : null;
const authFetch = (path) =>
  fetch(`${BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` } })
    .then(r => r.json());

// XP needed to go from level start to level end
const xpForLevel = (level) => Math.floor(100 * Math.pow(1.4, level - 1));

const BADGE_GROUPS = [
  { label: '🔥 Streaks',    ids: ['first_log','streak_3','streak_7','streak_14','streak_30'] },
  { label: '💰 Savings',    ids: ['saved_500','saved_5000','saved_25000','saved_100000'] },
  { label: '🎯 Goals',      ids: ['goal_1','goal_3','goal_10'] },
  { label: '⭐ Levels',     ids: ['level_5','level_10','level_20'] },
];

const LEVEL_TITLES = {
  1: 'Novice Saver', 5: 'Budget Rookie', 10: 'Finance Pro', 15: 'Wealth Hunter', 20: 'Money Master',
};
const getLevelTitle = (level) => {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a,b) => b-a);
  for (const k of keys) if (level >= k) return LEVEL_TITLES[k];
  return 'Novice Saver';
};

// Build a 7-week log calendar
const buildCalendar = (logDates = []) => {
  const set = new Set(logDates);
  const days = [];
  const today = new Date();
  for (let i = 48; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    days.push({ date: str, logged: set.has(str), isToday: i === 0 });
  }
  return days;
};

export default function StreaksPage() {
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | badges | leaderboard

  const load = useCallback(() => {
    Promise.all([authFetch('/streaks/me'), authFetch('/streaks/leaderboard')])
      .then(([me, lb]) => {
        setData(me);
        setLeaderboard(lb.leaderboard || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <AuthGuard>
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-2)' }}>Loading your progress...</div>
    </AuthGuard>
  );

  const { streak = {}, allBadges = [] } = data || {};
  const calendar = buildCalendar(streak.logDates);
  const xpPct = streak.xpNeeded > 0 ? Math.min(100, (streak.xpProgress / streak.xpNeeded) * 100) : 100;
  const levelTitle = getLevelTitle(streak.level || 1);
  const earnedBadges = allBadges.filter(b => b.unlocked);
  const lockedBadges = allBadges.filter(b => !b.unlocked);

  const badgeById = Object.fromEntries(allBadges.map(b => [b.id, b]));

  return (
    <AuthGuard>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress & Rewards 🏆</h1>
          <p className="page-subtitle">Streaks, badges and your financial journey</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '4px', width: 'fit-content' }}>
        {['overview', 'badges', 'leaderboard'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn btn-primary btn-sm' : 'btn btn-sm'} style={{ textTransform: 'capitalize', border: 'none' }}>
            {{ overview: '📊 Overview', badges: '🏅 Badges', leaderboard: '🏆 Leaderboard' }[t]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          {/* XP / Level Card */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', bottom: '-60px', left: '-20px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'relative' }}>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.75, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Level {streak.level || 1}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-display)', marginBottom: '2px' }}>{levelTitle}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{streak.xp || 0} XP total · {earnedBadges.length} badges earned</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{streak.level || 1}</div>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.8, marginBottom: '6px' }}>
                <span>Level {streak.level || 1}</span>
                <span>{streak.xpProgress || 0} / {streak.xpNeeded || xpForLevel((streak.level || 1))} XP to next level</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpPct}%`, background: 'white', borderRadius: '999px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-label">Current Streak</div>
              <div className="stat-value" style={{ color: streak.currentStreak >= 7 ? 'var(--warning)' : 'var(--primary)', fontSize: '2rem' }}>
                {streak.currentStreak || 0}🔥
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>days in a row</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Longest Streak</div>
              <div className="stat-value blue">{streak.longestStreak || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>personal best</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Goals Completed</div>
              <div className="stat-value green">{streak.goalsCompleted || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>goals crushed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Saved (Goals)</div>
              <div className="stat-value blue" style={{ fontSize: '1.4rem' }}>₹{(streak.totalSaved || 0).toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>put toward goals</div>
            </div>
          </div>

          {/* Activity Calendar */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Activity Calendar</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Last 7 weeks</span>
            </div>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
              {['S','M','T','W','T','F','S'].map((d,i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: '600' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
              {calendar.map(({ date, logged, isToday }) => (
                <div key={date} title={date} style={{
                  height: '28px',
                  borderRadius: '5px',
                  background: logged ? 'var(--primary)' : 'var(--surface-2)',
                  border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                  opacity: logged ? 1 : 0.6,
                  position: 'relative',
                  cursor: 'default',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--primary)', display: 'inline-block' }} /> Logged
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-block' }} /> No log
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--primary)', display: 'inline-block' }} /> Today
              </span>
            </div>
          </div>

          {/* Recent Badges */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Recently Earned Badges</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('badges')}>View all →</button>
            </div>
            {earnedBadges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
                <p style={{ fontSize: '0.875rem' }}>Log your first transaction to start earning badges!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {earnedBadges.slice(-6).reverse().map(badge => (
                  <div key={badge.id} style={{
                    background: 'var(--primary-light)', borderRadius: 'var(--radius)',
                    padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '10px',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--primary)' }}>{badge.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{badge.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BADGES ── */}
      {tab === 'badges' && (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
              <div className="stat-label">Earned</div>
              <div className="stat-value green">{earnedBadges.length}</div>
            </div>
            <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
              <div className="stat-label">Locked</div>
              <div className="stat-value" style={{ color: 'var(--text-3)' }}>{lockedBadges.length}</div>
            </div>
            <div className="stat-card" style={{ flex: 1, minWidth: '120px' }}>
              <div className="stat-label">Completion</div>
              <div className="stat-value blue">{allBadges.length > 0 ? Math.round((earnedBadges.length / allBadges.length) * 100) : 0}%</div>
            </div>
          </div>

          {BADGE_GROUPS.map(group => (
            <div key={group.label} className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '1rem' }}>{group.label}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '0.75rem' }}>
                {group.ids.map(id => {
                  const badge = badgeById[id];
                  if (!badge) return null;
                  return (
                    <div key={id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '0.875rem', borderRadius: 'var(--radius-sm)',
                      background: badge.unlocked ? 'var(--primary-light)' : 'var(--surface-2)',
                      border: `1px solid ${badge.unlocked ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                      opacity: badge.unlocked ? 1 : 0.65,
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: '1.75rem', filter: badge.unlocked ? 'none' : 'grayscale(1)' }}>
                        {badge.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.82rem', color: badge.unlocked ? 'var(--primary)' : 'var(--text)', marginBottom: '2px' }}>
                          {badge.name}
                          {badge.unlocked && <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: 'var(--success)', color: 'white', borderRadius: '999px', padding: '1px 6px' }}>✓</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{badge.description}</div>
                        {badge.unlocked && badge.unlockedAt && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: '3px' }}>
                            Earned {new Date(badge.unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── LEADERBOARD ── */}
      {tab === 'leaderboard' && (
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>Top 10 by XP</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Rankings across all FinMate users</p>
          </div>
          {leaderboard.length === 0 ? (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem' }}>No data yet — be the first to log!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboard.map((entry) => {
                const medals = ['🥇','🥈','🥉'];
                const medal = medals[entry.rank - 1] || `#${entry.rank}`;
                const isTopThree = entry.rank <= 3;
                return (
                  <div key={entry.rank} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)',
                    background: isTopThree ? 'var(--primary-light)' : 'var(--surface-2)',
                    border: isTopThree ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border)',
                  }}>
                    <div style={{ width: '28px', textAlign: 'center', fontSize: '1.1rem', fontWeight: '700' }}>{medal}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{entry.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        Level {entry.level} · {entry.currentStreak}🔥 streak · {entry.badgeCount} badges
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem' }}>{entry.xp} XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AuthGuard>
  );
}