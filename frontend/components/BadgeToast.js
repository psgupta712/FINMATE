'use client';
import { useEffect, useState } from 'react';

/**
 * BadgeToast — call with an array of newly earned badge objects.
 * Usage:
 *   const [newBadges, setNewBadges] = useState([]);
 *   // after API call that returns newBadges:
 *   if (response.newBadges?.length) setNewBadges(response.newBadges);
 *
 *   <BadgeToast badges={newBadges} onDone={() => setNewBadges([])} />
 */
export default function BadgeToast({ badges = [], onDone }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (badges.length > 0) {
      setCurrent(0);
      setVisible(true);
    }
  }, [badges]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (current + 1 < badges.length) {
        setCurrent(c => c + 1);
      } else {
        setVisible(false);
        onDone?.();
      }
    }, 3200);
    return () => clearTimeout(timer);
  }, [visible, current, badges.length, onDone]);

  if (!visible || !badges[current]) return null;

  const badge = badges[current];

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 10000,
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: 'white',
      borderRadius: 'var(--radius)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
      animation: 'badgeSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      maxWidth: '320px',
    }}>
      <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>{badge.icon}</div>
      <div>
        <div style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
          🎉 Badge Unlocked!
        </div>
        <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>{badge.name}</div>
        <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{badge.description}</div>
      </div>
      {badges.length > 1 && (
        <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '0.7rem', opacity: 0.7 }}>
          {current + 1}/{badges.length}
        </div>
      )}
      <style>{`@keyframes badgeSlideIn { from { transform: translateX(120px) scale(0.8); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }`}</style>
    </div>
  );
}