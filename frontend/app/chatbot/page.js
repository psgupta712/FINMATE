'use client';
import { useState, useRef, useEffect } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { useAuth } from '../../lib/auth';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SUGGESTIONS_FREE = [
  'How much did I spend this month?',
  'What are my savings goals?',
  'Give me money saving tips',
  'Explain UPI payments',
  'What is SIP investing?',
];

const SUGGESTIONS_PREMIUM = [
  'Analyse my spending habits',
  'Am I saving enough this month?',
  'Which category should I cut back on?',
  'How can I reach my goals faster?',
  'Give me a personalised budget plan',
];

export default function ChatbotPage() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: isPremium
        ? `Hey ${user?.name?.split(' ')[0] || 'there'} 👋 I'm your AI financial coach. I have access to your real spending data — ask me anything!`
        : `Hey ${user?.name?.split(' ')[0] || 'there'} 👋 I'm FinMate's finance assistant. I can answer questions about your spending, goals, and financial basics.\n\n⭐ Upgrade to **Premium** for real AI insights personalised to your actual data!`,
      type: 'greeting',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('finMate_token');
      const res = await fetch(`${BASE_URL}/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response,
        type: data.type,
        isAI: data.isPremium,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, something went wrong: ${err.message}`, type: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = isPremium ? SUGGESTIONS_PREMIUM : SUGGESTIONS_FREE;

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isPremium ? '🤖 AI Financial Coach' : '🤖 AI Assistant'}
          </h1>
          <p className="page-subtitle">
            {isPremium ? 'Powered by Llama 4 · Knows your real spending data' : 'Basic financial assistant · Upgrade for AI insights'}
          </p>
        </div>
        {isPremium && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '6px 16px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
            ⭐ Premium AI Active
          </div>
        )}
      </div>

      {/* Upsell banner for free users */}
      {!isPremium && (
        <div style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)', border: '1px solid #c7d2fe', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: '#3730a3', marginBottom: '2px' }}>⭐ Unlock real AI insights</p>
            <p style={{ fontSize: '0.82rem', color: '#4338ca' }}>Premium users get a real AI coach that reads your actual transactions and gives personalised advice.</p>
          </div>
          <Link href="/subscription" className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
            Upgrade — ₹99/mo
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Chat window */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '68vh' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-end' }}>

                {msg.role === 'assistant' && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isPremium ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    🤖
                  </div>
                )}

                <div style={{
                  maxWidth: '72%',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-2)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                  {msg.isAI && (
                    <div style={{ marginTop: '6px', fontSize: '0.7rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✨ AI · Llama 4
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem', flexShrink: 0 }}>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                <div style={{ background: 'var(--surface-2)', padding: '0.75rem 1rem', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: `bounce 1s ${d * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder={isPremium ? 'Ask anything about your finances...' : 'Ask about spending, goals, tips...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: '0 1.25rem' }}>
              Send
            </button>
          </div>
        </div>

        {/* Suggestions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-2)' }}>
              {isPremium ? '✨ Try asking' : '💬 Try asking'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  style={{ textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-2)', cursor: 'pointer', lineHeight: '1.4', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.target.style.background = 'var(--primary-light)'; e.target.style.color = 'var(--primary)'; e.target.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.target.style.background = 'var(--surface-2)'; e.target.style.color = 'var(--text-2)'; e.target.style.borderColor = 'var(--border)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!isPremium && (
            <div className="card" style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)', border: '1px solid #c7d2fe' }}>
              <p style={{ fontSize: '0.8rem', color: '#3730a3', fontWeight: '600', marginBottom: '6px' }}>⭐ Premium AI can:</p>
              <ul style={{ fontSize: '0.78rem', color: '#4338ca', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.5' }}>
                <li>Analyse your real transactions</li>
                <li>Spot overspending patterns</li>
                <li>Give personalised advice</li>
                <li>Help you reach goals faster</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </AuthGuard>
  );
}