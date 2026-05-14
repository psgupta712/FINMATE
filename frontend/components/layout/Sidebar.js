'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

const NAV_ITEMS = [
  { href: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { href: '/transactions',  icon: '💳', label: 'Transactions' },
  { href: '/budget',        icon: '📋', label: 'Budget' },
  { href: '/goals',         icon: '🎯', label: 'Goals' },
  { href: '/wallet',        icon: '👛', label: 'Wallet' },
  { href: '/streaks',       icon: '🏆', label: 'Progress' },
  { href: '/chatbot',       icon: '🤖', label: 'AI Assistant' },
  { href: '/subscription',  icon: '⭐', label: 'Subscription' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo — no theme toggle here; it lives in the top-right header */}
      <div className="sidebar-logo">
        💰 <span>Fin<b>Bot</b></span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Theme toggle as a nav item at the bottom of the nav */}
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>

      {user && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem'
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                <span className={`badge badge-${user.plan}`}>{user.plan}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            🚪 Log Out
          </button>
        </div>
      )}
    </aside>
  );
}