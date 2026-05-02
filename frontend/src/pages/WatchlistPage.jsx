import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeDetail } from '../hooks/useAnime';

const TABS = [['all', 'All'], ['watching', 'Watching'], ['want', 'Want'], ['completed', 'Done'], ['dropped', 'Dropped']];

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { theme: t } = useThemeStore();
  const { entries, upsertEntry, removeEntry } = useWatchlistStore();
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? entries : entries.filter((e) => e.status === tab);

  return (
    <div style={{ padding: '36px 40px' }} className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 800, fontSize: 26, color: t.text, marginBottom: 8 }}>My Watchlist</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Total', entries.length], ['Completed', entries.filter((e) => e.status === 'completed').length]].map(([l, v]) => (
            <div key={l}>
              <span style={{ fontWeight: 800, fontSize: 20, color: t.accent }}>{v}</span>
              <span style={{ fontSize: 13, color: t.textMuted, marginLeft: 6 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: 20, borderBottom: `1px solid ${t.border}` }}>
        {TABS.map(([id, label]) => {
          const count = id === 'all' ? entries.length : entries.filter((e) => e.status === id).length;
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 18px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? t.accent : 'transparent'}`,
              color: active ? t.accent : t.textMuted,
              fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .12s', marginBottom: -1,
            }}>
              {label} {count > 0 && <span style={{ opacity: 0.55, fontSize: 12 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 16 }}>Nothing here yet.</div>
          <button
            onClick={() => navigate('/')}
            style={{ background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}
          >
            Browse Discover
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((entry) => (
            <WatchlistItem
              key={entry.animeId}
              entry={entry}
              t={t}
              navigate={navigate}
              onStatusChange={upsertEntry}
              onRemove={removeEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistItem({ entry, t, navigate, onStatusChange, onRemove }) {
  const { data: anime, isLoading } = useAnimeDetail(entry.animeId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 16px', height: 88 }}>
        <div style={{ width: 48, height: 68, background: t.surface2, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: '40%', height: 14, background: t.surface2, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '25%', height: 11, background: t.surface2, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (!anime) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 16px' }}>
      <AnimeCover anime={anime} width={48} height={68} style={{ borderRadius: 4 }} />
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/anime/${anime.id}`)}>
        <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>{anime.title}</div>
        <div style={{ fontSize: 12, color: t.textMuted }}>{anime.jp} · {anime.eps} eps</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => onStatusChange(entry.animeId, key)} style={{
            padding: '5px 10px', cursor: 'pointer',
            background: entry.status === key ? `${STATUS_COLORS[key]}20` : 'transparent',
            border: `1px solid ${entry.status === key ? STATUS_COLORS[key] : t.border}`,
            color: entry.status === key ? STATUS_COLORS[key] : t.textMuted,
            fontSize: 11, fontWeight: 600, borderRadius: 6,
          }}>{label}</button>
        ))}
        <button
          onClick={() => onRemove(entry.animeId)}
          style={{ padding: '5px 10px', cursor: 'pointer', background: 'transparent', border: `1px solid ${t.border}`, color: '#f87171', fontSize: 11, fontWeight: 600, borderRadius: 6 }}
        >✕</button>
      </div>
    </div>
  );
}
