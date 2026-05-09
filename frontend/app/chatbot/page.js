'use client';
import { useState, useRef, useEffect } from 'react';
import AuthGuard from '../../components/layout/AuthGuard';
import { chatbotAPI } from '../../lib/api';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Give me money saving tips',
  'Explain UPI payments',
  'What are my savings goals?',
  'Tell me about credit cards',
  'How to start investing as a student?',
];

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: `Hi! I'm your **FinMate AI Assistant** 🤖\n\nI can help you:\n• Track spending & income\n• Set and review savings goals\n• Learn about UPI, credit cards, wallets\n• Give personalised financial tips\n\nWhat would you like to know?`,
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: msg }]);
    setLoading(true);
    try {
      const data = await chatbotAPI.message(msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: 'Sorry, I had trouble responding. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Finance Assistant 🤖</h1>
          <p className="page-subtitle">Ask me anything about your finances or financial concepts</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', maxWidth: '80%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'bot' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-2)',
                color: msg.role === 'user' ? 'white' : 'var(--text)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
              }}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
              <div style={{ padding: '0.75rem 1rem', borderRadius: '4px 18px 18px 18px', background: 'var(--surface-2)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-3)', animation: `bounce 1s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="btn btn-outline btn-sm" style={{ fontSize: '0.78rem' }} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}>
          <input
            className="form-input"
            style={{ borderRadius: '999px' }}
            placeholder="Ask me about your finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ borderRadius: '999px', padding: '0.6rem 1.25rem' }}>
            Send
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }`}</style>
    </AuthGuard>
  );
}
