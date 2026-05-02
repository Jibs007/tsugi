import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listsApi } from '../lib/api';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail } from '../hooks/useAnime';

export default function BrowseListsPage({ user, onAuthClick }) {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { myLists } = useWatchlistStore();
  const [publicLists, setPublicLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    listsApi.getPublic()
      .then((rows) => setPublicLists(rows))
      .catch(() => setPublicLists([]))
      .finally(() => setLoading(false));
  }, []);

  // Merge: public lists + own lists not already in public results
  const ownListIds = new Set(publicLists.map((l) => l.id));
  const ownAsPublic = myLists
    .filter((l) => !ownListIds.has(l.id))
    .map((l) => ({
      ...l,
      author:      user?.username || 'you',
      description: l.desc,
      anime_ids:   l.animeIds,
      is_public:   l.isPublic,
      followers:   l.followers || 0,
    }));

  const allLists = [...publicLists, ...ownAsPublic];

  return (
    <div style={{ padding: '36px 40px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ fontWeight: 800, fontSize: 26, color: t.text }}>Lists</div>
        <button
          onClick={() => user ? navigate('/lists/create') : onAuthClick()}
          style={{ padding: '10px 20px', background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          + New List
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 200, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : allLists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>No public lists yet.</div>
          <button onClick={() => user ? navigate('/lists/create') : onAuthClick()} style={{ padding: '10px 20px', background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Be the first to create one
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {allLists.map((list) => {
            const animeIds = list.anime_ids ?? list.animeIds ?? [];
            const isFollowed = followed.has(list.id);
            const isOwn = list.author === (user?.username) || myLists.some((l) => l.id === list.id);

            return (
              <div key={list.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Cover strip */}
                <CoverStrip animeIds={animeIds.slice(0, 3)} t={t} />

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 2 }}>{list.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                    by {list.author} · {animeIds.length} anime
                  </div>
                  <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                    {list.description || list.desc || ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: t.textMuted }}>{Number(list.followers || 0).toLocaleString()} followers</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isOwn && (
                        <button
                          onClick={() => navigate(`/lists/${list.id}/edit`)}
                          style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 }}
                        >Edit</button>
                      )}
                      {!isOwn && (
                        <button
                          onClick={() => {
                            if (!user) { onAuthClick(); return; }
                            setFollowed((prev) => {
                              const next = new Set(prev);
                              isFollowed ? next.delete(list.id) : next.add(list.id);
                              return next;
                            });
                          }}
                          style={{
                            padding: '6px 14px',
                            background: isFollowed ? t.accentMuted : 'transparent',
                            border: `1px solid ${isFollowed ? t.accent : t.border}`,
                            color: isFollowed ? t.accent : t.textMuted,
                            fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
                          }}
                        >
                          {isFollowed ? '✓ Following' : '+ Follow'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CoverStrip({ animeIds, t }) {
  if (animeIds.length === 0) {
    return (
      <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: t.textDim, background: t.surface2 }}>
        Empty
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', height: 84 }}>
      {animeIds.map((id) => <CoverSlot key={id} id={id} t={t} />)}
    </div>
  );
}

function CoverSlot({ id, t }) {
  const { data: anime } = useAnimeDetail(id);
  const color = anime?.color || t.accent;
  return (
    <div style={{ flex: 1, height: 84, position: 'relative', overflow: 'hidden', borderRight: `1px solid ${t.border}` }}>
      {anime?.image ? (
        <img src={anime.image} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${color}25, ${t.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color, opacity: 0.9 }}>
          {anime ? (anime.jp || anime.title || '').slice(0, 2) : '…'}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }} />
    </div>
  );
}
