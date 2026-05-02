import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ANIME, MOCK_LISTS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';

export default function BrowseListsPage({ user, onAuthClick }) {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { myLists } = useWatchlistStore();
  const [followed, setFollowed] = useState([]);

  const allLists = [...MOCK_LISTS, ...myLists.map((l) => ({ ...l, author: user || 'you' }))];

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
        {allLists.map((list) => {
          const covers = list.animeIds.slice(0, 3).map((id) => MOCK_ANIME.find((a) => a.id === id)).filter(Boolean);
          const isFollowed = followed.includes(list.id);
          const isOwn = list.author === (user || 'you');

          return (
            <div key={list.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Cover strip */}
              <div style={{ display: 'flex', height: 84 }}>
                {covers.length > 0 ? covers.map((anime) => (
                  <div key={anime.id} style={{
                    flex: 1, height: 84, position: 'relative', overflow: 'hidden',
                    background: `linear-gradient(160deg, ${anime.color}25, ${t.bg})`,
                    borderRight: `1px solid ${t.border}`,
                  }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: anime.color, opacity: 0.9 }}>
                      {anime.jp.slice(0, 2)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: anime.color, opacity: 0.6 }} />
                  </div>
                )) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: t.textDim }}>Empty</div>
                )}
              </div>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 2 }}>{list.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>by {list.author} · {list.animeIds.length} anime</div>
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{list.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: t.textMuted }}>{(list.followers || 0).toLocaleString()} followers</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isOwn && (
                      <button
                        onClick={() => navigate(`/lists/${list.id}/edit`)}
                        style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 6 }}
                      >Edit</button>
                    )}
                    {!isOwn && (
                      <button
                        onClick={() => user ? setFollowed((f) => isFollowed ? f.filter((i) => i !== list.id) : [...f, list.id]) : onAuthClick()}
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
    </div>
  );
}
