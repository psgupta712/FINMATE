'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form.name, form.email, form.password, form.college);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel */}
      <div style={{ flex: 1, background: 'linear-gradient(160deg, #6366f1, #8b5cf6, #06b6d4)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: '800', marginBottom: '1rem' }}>
          💰 FinMate
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem', lineHeight: '1.3', fontFamily: 'var(--font-display)' }}>
          Your AI-powered finance companion for students
        </h2>
        <p style={{ opacity: 0.85, lineHeight: '1.7', marginBottom: '2rem' }}>
          Track spending, set goals, learn about finance, and manage your wallet — all in one place.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {['📊 Smart budget tracking', '🤖 AI financial advisor', '💳 Razorpay wallet integration', '🎯 Savings goal tracker'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', opacity: 0.9 }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', fontSize: '0.9rem', padding: 0 }}>
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">College / University</label>
                  <input className="form-input" placeholder="e.g. IIT Delhi (optional)" value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@college.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? '⏳ Please wait...' : mode === 'login' ? '🚀 Log In' : '🎉 Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
