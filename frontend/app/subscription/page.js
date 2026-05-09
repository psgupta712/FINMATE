'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { subscriptionsAPI, openRazorpayCheckout } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const FEATURES_FREE = ['Expense & income tracking', 'Monthly budget creation', 'Up to 3 savings goals', 'Basic AI chatbot', 'Wallet (add money)'];
const FEATURES_PREMIUM = ['Everything in Free', 'Unlimited savings goals', 'AI-powered financial insights', 'PDF & CSV expense reports', 'Smart spending alerts', 'Priority support'];

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  useEffect(() => {
    subscriptionsAPI.status().then(d => setStatus(d.subscription));
  }, []);

  const handleUpgrade = async () => {
    setPaying(true);
    try {
      const order = await subscriptionsAPI.createOrder('premium');
      openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        keyId: order.keyId,
        name: 'FinMate Premium',
        description: 'Premium Monthly Subscription — ₹99',
        prefill: { name: user?.name, email: user?.email },
        onSuccess: async (resp) => {
          try {
            await subscriptionsAPI.verify({ ...resp, plan: 'premium' });
            await refreshUser();
            showToast('🎉 Welcome to Premium! All features unlocked.');
            subscriptionsAPI.status().then(d => setStatus(d.subscription));
          } catch (e) {
            showToast('Verification failed. Contact support.');
          }
          setPaying(false);
        },
        onFailure: (err) => {
          showToast(`Payment failed: ${err}`);
          setPaying(false);
        },
      });
    } catch (e) {
      showToast(e.message);
      setPaying(false);
    }
  };

  const isPremium = user?.plan === 'premium';

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Plans ⭐</h1>
          <p className="page-subtitle">Choose the right plan for your financial journey</p>
        </div>
      </div>

      {isPremium && (
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>🎉</div>
          <div>
            <h3 style={{ marginBottom: '2px' }}>You're on Premium!</h3>
            <p style={{ opacity: 0.85, fontSize: '0.875rem' }}>
              {status?.endDate ? `Active until ${new Date(status.endDate).toLocaleDateString()}` : 'All features unlocked'}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '700px' }}>
        {/* Free Plan */}
        <div className="card" style={{ position: 'relative' }}>
          {!isPremium && (
            <div style={{ position: 'absolute', top: '-12px', left: '1.5rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 12px', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-2)' }}>
              Current Plan
            </div>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Free</h2>
            <div style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>₹0</div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Forever free</div>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {FEATURES_FREE.map(f => (
              <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <button className="btn btn-outline" style={{ width: '100%' }} disabled>
            {isPremium ? 'Downgrade' : 'Current Plan'}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="card" style={{ border: '2px solid var(--primary)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '1.5rem', background: 'var(--primary)', borderRadius: '999px', padding: '3px 14px', fontSize: '0.72rem', fontWeight: '600', color: 'white' }}>
            ⭐ Most Popular
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Premium</h2>
            <div style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>₹99</div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>per month</div>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {FEATURES_PREMIUM.map(f => (
              <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--primary)', flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <button className="btn btn-primary" style={{ width: '100%' }} disabled>✓ Active</button>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpgrade} disabled={paying}>
              {paying ? '⏳ Processing...' : '⭐ Upgrade to Premium'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)', maxWidth: '700px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>🔒 Secure Payment</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: '1.6' }}>
          All payments are processed securely via Razorpay. We accept UPI, Credit/Debit Cards, Net Banking, and Wallets. Your payment data is never stored on our servers.
        </p>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}
