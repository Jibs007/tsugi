import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export default function AuthModal({ onClose, t }) {
  const [tab, setTab]           = useState('login');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [pass, setPass]         = useState('');

  const { login, signup, loading, error, clearError } = useAuthStore();
  const { authApi } = { authApi: { googleLogin: () => { window.location.href = '/api/auth/google'; } } };

  const handleSubmit = async () => {
    clearError();
    try {
      if (tab === 'login') {
        await login(email, pass);
      } else {
        await signup(username, email, pass);
      }
      onClose();
    } catch {
      // error is in the store
    }
  };

  const inputStyle = {
    width: '100%', background: t.surface2, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '11px 14px', color: t.text, outline: 'none',
    fontSize: 15, boxSizing: 'border-box', transition: 'border-color .15s',
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block',
    marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ width: 420, background: t.bg2, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        className="animate-slide-up"
      >
        {/* Header */}
        <div style={{ padding: '28px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="logo-flicker" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: t.accent, letterSpacing: 4, marginBottom: 6 }}>TSUGI</div>
            <div style={{ fontSize: 13, color: t.textMuted }}>{tab === 'login' ? 'Welcome back' : 'Create your account'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '20px 32px 0', background: t.surface, borderRadius: 8, padding: 3 }}>
          {[['login', 'Log In'], ['signup', 'Sign Up']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); clearError(); }} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: tab === id ? t.bg2 : 'transparent',
              color: tab === id ? t.text : t.textMuted,
              fontWeight: 600, fontSize: 14,
              boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Error */}
          {error && (
            <div style={{ background: '#f8717122', border: '1px solid #f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label style={labelStyle}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tsugi.app" style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={inputStyle}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            marginTop: 4, padding: '13px', background: t.accent, border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'opacity .15s',
          }}>
            {loading ? '…' : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: t.textMuted }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); clearError(); }} style={{ color: t.accent, cursor: 'pointer', fontWeight: 600 }}>
              {tab === 'login' ? 'Sign Up' : 'Log In'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
