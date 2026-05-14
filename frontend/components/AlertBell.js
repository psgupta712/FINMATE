'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('finMate_token') : null;

export default function AlertBell({ isPremium }) {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/alerts/summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const n = isPremium
          ? (data.alerts || []).filter(a => a.type === 'danger' || a.type === 'warning').length
          : (data.count || 0);
        setCount(prev => {
          if (n > prev) setPulse(true);
          return n;
        });
      }
    } catch (_) {}
  }, [isPremium]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [pulse]);

  return (
    <>
      <Link
        href="/alerts"
        title="Smart Alerts"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          textDecoration: 'none',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--primary-light)';
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--surface)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={count > 0 ? 'var(--primary)' : 'var(--text-2)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: pulse ? 'bellRing 0.6s ease' : 'none' }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            minWidth: '18px',
            height: '18px',
            borderRadius: '999px',
            background: '#ef4444',
            color: 'white',
            fontSize: '0.62rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg)',
            lineHeight: 1,
            animation: pulse ? 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>

      <style>{`
        @keyframes bellRing {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-15deg); }
          40%  { transform: rotate(15deg); }
          60%  { transform: rotate(-10deg); }
          80%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0.6); }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}