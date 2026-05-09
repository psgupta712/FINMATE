'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { walletAPI, paymentsAPI, openRazorpayCheckout } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchWallet = async () => {
    try {
      const [balRes, histRes] = await Promise.all([walletAPI.balance(), walletAPI.history()]);
      setWallet({ balance: balRes.balance, transactions: histRes.transactions });
    } catch (e) {
      showToast('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleAddMoney = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) return showToast('Minimum ₹10 required');
    setPaying(true);
    try {
      const order = await paymentsAPI.createOrder(amt);
      openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        keyId: order.keyId,
        name: 'FinMate Wallet',
        description: 'Wallet Top-up',
        prefill: { name: user?.name, email: user?.email },
        onSuccess: async (resp) => {
          try {
            await paymentsAPI.verify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            showToast(`✅ ₹${amt} added to wallet!`);
            setAmount('');
            await fetchWallet();
          } catch (e) {
            showToast('Payment verification failed');
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

  const QUICK_AMOUNTS = [100, 250, 500, 1000];

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Wallet 👛</h1>
          <p className="page-subtitle">Manage your FinMate wallet balance</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem' }}>
        {/* Wallet Card */}
        <div>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius-lg)', padding: '2rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>Available Balance</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>
              ₹{loading ? '...' : wallet.balance.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {user?.name} · FinMate Wallet
            </div>
          </div>

          {/* Add Money */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Add Money</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  className={`btn btn-sm ${amount === String(a) ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAmount(String(a))}
                >
                  ₹{a}
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Custom Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="10"
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleAddMoney}
              disabled={paying || !amount}
            >
              {paying ? '⏳ Processing...' : '💳 Pay with Razorpay'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.5rem', textAlign: 'center' }}>
              Secured by Razorpay · UPI, Cards, Net Banking accepted
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.25rem' }}>Transaction History</h3>
          {loading ? (
            <p style={{ color: 'var(--text-3)' }}>Loading...</p>
          ) : wallet.transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <p>No wallet transactions yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
              {wallet.transactions.map((tx, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tx.type === 'credit' ? '#d1fae5' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {tx.type === 'credit' ? '⬆️' : '⬇️'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{tx.description || tx.type}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{new Date(tx.date).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: tx.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Bal: ₹{tx.balanceAfter.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </AuthGuard>
  );
}
