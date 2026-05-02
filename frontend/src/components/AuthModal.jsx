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

          {/* Google OAuth */}
          <button onClick={() => { window.location.href = '/api/auth/google'; }} style={{
            padding: '12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8,
            color: t.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
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
