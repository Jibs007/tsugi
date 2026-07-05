import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AuthModal from './components/AuthModal';
import ThemePanel from './components/ThemePanel';
import DiscoverPage from './pages/DiscoverPage';
import AnimeDetailPage from './pages/AnimeDetailPage';
import WatchlistPage from './pages/WatchlistPage';
import BrowseListsPage from './pages/BrowseListsPage';
import CreateListPage from './pages/CreateListPage';
import ProfilePage from './pages/ProfilePage';
import GenreBrowsePage from './pages/GenreBrowsePage';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import { useWatchlistStore } from './stores/watchlistStore';

function OAuthCallback() {
  const navigate    = useNavigate();
  const handleOAuth = useAuthStore((s) => s.handleOAuthCallback);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      handleOAuth(token);
      window.history.replaceState({}, '', '/');
    }
    navigate('/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function GuestGuard({ user, onAuthClick, children }) {
  if (!user) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontSize: 16 }}>
        Please{' '}
        <span onClick={onAuthClick} style={{ cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
          log in
        </span>{' '}
        to access this page.
      </div>
    );
  }
  return children;
}

export default function App() {
  const { theme: t }       = useThemeStore();
  const { user, initAuth } = useAuthStore();
  const { showAuth, openAuth, closeAuth } = useUIStore();
  const { loadWatchlist, loadMyLists, clearAll } = useWatchlistStore();

  useEffect(() => { initAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      loadWatchlist();
      loadMyLists();
    } else {
      clearAll();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.background = t.bg;
    document.body.style.color      = t.text;
  }, [t]);

  const commonProps = { user, onAuthClick: openAuth };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: t.bg, color: t.text }}>
      <Sidebar user={user} onAuthClick={openAuth} t={t} />

      {/* Right column: topbar + scrollable content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Topbar />
        <main id="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/"              element={<DiscoverPage {...commonProps} />} />
            <Route path="/anime/:id"     element={<AnimeDetailPage {...commonProps} />} />
            <Route path="/lists"         element={<BrowseListsPage {...commonProps} />} />
            <Route path="/genres"        element={<GenreBrowsePage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />

            <Route path="/watchlist" element={
              <GuestGuard {...commonProps}><WatchlistPage /></GuestGuard>
            } />
            <Route path="/lists/create" element={
              <GuestGuard {...commonProps}><CreateListPage /></GuestGuard>
            } />
            <Route path="/lists/:id/edit" element={
              <GuestGuard {...commonProps}><CreateListPage /></GuestGuard>
            } />
            <Route path="/profile" element={
              <GuestGuard {...commonProps}><ProfilePage user={user} /></GuestGuard>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {showAuth && <AuthModal onClose={closeAuth} t={t} />}
      <ThemePanel />
    </div>
  );
}
