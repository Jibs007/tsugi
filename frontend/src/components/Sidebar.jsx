import { Link, useLocation, useNavigate } from 'react-router-dom';

const NAV = [
  { path: '/',          label: 'Discover', icon: '◈' },
  { path: '/watchlist', label: 'My List',  icon: '▶', auth: true },
  { path: '/lists',     label: 'Lists',    icon: '⊞' },
  { path: '/genres',    label: 'Genres',   icon: '◎' },
  { path: '/profile',   label: 'Profile',  icon: '◉', auth: true },
];

export default function Sidebar({ user, onAuthClick, t }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Navigate to Discover with a reset signal so DiscoverPage clears all filters
  const handleLogoClick = (e) => {
    e.preventDefault();
    navigate('/', { state: { reset: Date.now() } });
  };

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: t.bg2,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo — navigates to Discover and clears all filter state */}
      <Link
        to="/"
        onClick={handleLogoClick}
        style={{ textDecoration: 'none', padding: '24px 22px 20px', display: 'block', borderBottom: `1px solid ${t.border}` }}
      >
        <div
          className="logo-flicker"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 17, color: t.accent, letterSpacing: 4, marginBottom: 4 }}
        >
          TSUGI
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2 }}>ツギ · Anime Watchlist</div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map((item) => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const locked = item.auth && !user;

          const handleClick = (e) => {
            if (locked) {
              e.preventDefault();
              onAuthClick();
            }
          };

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleClick}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 22px',
                  cursor: 'pointer',
                  background: active ? t.accentMuted : 'transparent',
                  borderLeft: `3px solid ${active ? t.accent : 'transparent'}`,
                  color: active ? t.accent : t.textMuted,
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'all .12s',
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = t.text; e.currentTarget.style.background = t.surface; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = 'transparent'; } }}
              >
                <span style={{ fontSize: 15, opacity: 0.8 }}>{item.icon}</span>
                <span>{item.label}</span>
                {locked && <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textDim }}>⚿</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User area */}
      {user ? (
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div
            style={{ padding: '14px 22px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: `${t.accent}28`, border: `1px solid ${t.accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: t.accent,
            }}>
              {(user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{user?.username || user?.email}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>View profile</div>
            </div>
          </div>
        </Link>
      ) : (
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={onAuthClick}
            style={{
              width: '100%', padding: '10px', background: t.accent, border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Log In / Sign Up
          </button>
        </div>
      )}
    </aside>
  );
}
