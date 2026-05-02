import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import StatusBadge from '../components/StatusBadge';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail } from '../hooks/useAnime';

export default function AnimeDetailPage({ user, onAuthClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { entries, upsertEntry, removeEntry, myLists, addAnimeToList } = useWatchlistStore();
  const [showListPicker, setShowListPicker] = useState(false);
  const [toast, setToast] = useState(null);

  const { data: anime, isLoading, isError } = useAnimeDetail(id);
  const entry = entries.find((e) => e.animeId === Number(id));

  if (isLoading) {
    return <DetailSkeleton t={t} />;
  }

  if (isError || !anime) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: t.textMuted }}>
        Anime not found.{' '}
        <span onClick={() => navigate('/')} style={{ color: t.accent, cursor: 'pointer' }}>Go home</span>
      </div>
    );
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const setStatus = (status) => {
    if (!user) { onAuthClick(); return; }
    if (status === null) removeEntry(anime.id);
    else upsertEntry(anime.id, status);
  };

  const handleAddToList = (listId) => {
    addAnimeToList(listId, anime.id);
    setShowListPicker(false);
    showToast('Added to list ✓');
  };

  const btnBase = {
    padding: '9px 16px', cursor: 'pointer', borderRadius: 7,
    fontWeight: 700, fontSize: 13, transition: 'all .13s', border: 'none',
  };

  return (
    <div style={{ padding: '40px', maxWidth: 900 }} className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0 }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', gap: 36, marginBottom: 36 }}>
        <AnimeCover anime={anime} width={180} height={252} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 34, color: t.text, lineHeight: 1.1, marginBottom: 4 }}>{anime.title}</div>
          <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 16 }}>{anime.jp}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
            {anime.genres.map((g) => (
              <span key={g} style={{ fontSize: 12, fontWeight: 700, color: t.accent2, background: t.accentMuted, borderRadius: 5, padding: '3px 10px' }}>{g}</span>
            ))}
            <StatusBadge status={anime.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[['Score', `★ ${anime.rating}`], ['Episodes', anime.eps], ['Year', anime.year], ['Studio', anime.studio || '—']].map(([label, val]) => (
              <div key={label} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{val}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.75, marginBottom: 24, maxWidth: 540 }}>{anime.desc}</p>

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', alignItems: 'center' }}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatus(entry?.status === key ? null : key)}
                style={{
                  ...btnBase,
                  background: entry?.status === key ? `${STATUS_COLORS[key]}20` : t.surface,
                  border: `1px solid ${entry?.status === key ? STATUS_COLORS[key] : t.border}`,
                  color: entry?.status === key ? STATUS_COLORS[key] : t.textMuted,
                }}
              >
                {label}
              </button>
            ))}

            <button
              onClick={() => { if (!user) { onAuthClick(); return; } setShowListPicker((p) => !p); }}
              style={{ ...btnBase, background: t.accentMuted, border: `1px solid ${t.accent}55`, color: t.accent }}
            >
              + Add to List
            </button>

            {showListPicker && (
              <div style={{
                position: 'absolute', top: '115%', left: 0, zIndex: 20,
                background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10,
                padding: 8, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {myLists.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: t.textMuted }}>
                    No lists yet.{' '}
                    <span onClick={() => navigate('/lists/create')} style={{ color: t.accent, cursor: 'pointer', fontWeight: 600 }}>Create one?</span>
                  </div>
                )}
                {myLists.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => handleAddToList(l.id)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 6, fontWeight: 600, fontSize: 14, color: t.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{l.name}</span>
                    {l.animeIds.includes(anime.id) && <span style={{ color: t.accent2 }}>✓</span>}
                  </div>
                ))}
                <div
                  onClick={() => { setShowListPicker(false); navigate('/lists/create'); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderTop: `1px solid ${t.border}`, fontSize: 13, color: t.accent, fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  + Create new list
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 999,
          background: t.surface2, border: `1px solid ${t.accent}55`,
          borderRadius: 10, padding: '12px 22px',
          fontWeight: 700, fontSize: 14, color: t.accent,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
          className="animate-fade-in"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton({ t }) {
  return (
    <div style={{ padding: '40px', maxWidth: 900 }} className="animate-fade-in">
      <div style={{ width: 60, height: 16, background: t.surface, borderRadius: 6, marginBottom: 24, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: 36 }}>
        <div style={{ width: 180, height: 252, background: t.surface, borderRadius: 10, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ width: '60%', height: 36, background: t.surface, borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '35%', height: 16, background: t.surface, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 70, 90].map((w, i) => (
              <div key={i} style={{ width: w, height: 24, background: t.surface, borderRadius: 5, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 4 }}>
            {[0,1,2,3].map((i) => (
              <div key={i} style={{ height: 60, background: t.surface, borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
          <div style={{ height: 80, background: t.surface, borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
}
