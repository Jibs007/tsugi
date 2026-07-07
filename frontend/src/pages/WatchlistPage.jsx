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
          {[
            ['Total', entries.length],
            ['Completed', entries.filter((e) => e.status === 'completed').length],
            ['Episodes watched', entries.reduce((s, e) => s + (e.progress || 0), 0)],
          ].map(([l, v]) => (
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
          <div style={{ fontSize: 15, color: t.textMuted, marginBottom: 16 }}>
            Nothing here yet — head to Discover to find something to watch.
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ background: t.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}
          >
            Discover
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
        <div className="skeleton" style={{ width: 48, height: 68, background: t.surface2, borderRadius: 4 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ width: '40%', height: 14, background: t.surface2, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '25%', height: 11, background: t.surface2, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  if (!anime) return null;

  const totalEps = typeof anime.eps === 'number' ? anime.eps : null;
  const progress = entry.progress ?? 0;

  const setProgress = (next) => {
    const clamped = Math.max(0, totalEps != null ? Math.min(next, totalEps) : next);
    if (clamped === progress) return;
    const patch = { progress: clamped };
    // Watching the last episode = finished (mirrors MAL behaviour)
    if (totalEps != null && clamped === totalEps && entry.status !== 'completed') patch.status = 'completed';
    onStatusChange(entry.animeId, patch);
  };

  const setStatus = (key) => {
    const patch = { status: key };
    // Marking completed fills the episode count in, like MAL does
    if (key === 'completed' && totalEps != null) patch.progress = totalEps;
    onStatusChange(entry.animeId, patch);
  };

  const stepBtn = {
    width: 22, height: 22, borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted,
    fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: '10px 16px' }}>
      <AnimeCover anime={anime} width={48} height={68} style={{ borderRadius: 4 }} />
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/anime/${anime.id}`)}>
        <div style={{ fontWeight: 700, fontSize: 15, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anime.title}</div>
        <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {anime.jp} · {anime.type ? `${anime.type} · ` : ''}{anime.eps} eps
        </div>
      </div>

      {/* Episode progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={() => setProgress(progress - 1)} disabled={progress <= 0} style={{ ...stepBtn, opacity: progress <= 0 ? 0.4 : 1 }}>−</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text, minWidth: 52, textAlign: 'center' }}>
          {progress} / {totalEps ?? '?'}
        </span>
        <button
          onClick={() => setProgress(progress + 1)}
          disabled={totalEps != null && progress >= totalEps}
          style={{ ...stepBtn, opacity: totalEps != null && progress >= totalEps ? 0.4 : 1 }}
        >+</button>
      </div>

      {/* Personal rating */}
      <select
        value={entry.rating ?? ''}
        onChange={(e) => e.target.value && onStatusChange(entry.animeId, { rating: Number(e.target.value) })}
        title="Your rating"
        style={{
          flexShrink: 0, background: t.surface2, border: `1px solid ${t.border}`,
          color: entry.rating ? t.text : t.textMuted, borderRadius: 6,
          padding: '4px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="" disabled>rate</option>
        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>★ {n}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setStatus(key)} style={{
            padding: '5px 10px', cursor: 'pointer',
            background: entry.status === key ? `${STATUS_COLORS[key]}20` : 'transparent',
            border: `1px solid ${entry.status === key ? STATUS_COLORS[key] : t.border}`,
            color: entry.status === key ? STATUS_COLORS[key] : t.textMuted,
            fontSize: 11, fontWeight: 600, borderRadius: 6,
          }}>{label}</button>
        ))}
        <button
          onClick={() => onRemove(entry.animeId)}
          title="Remove from watchlist"
          style={{ padding: '5px 10px', cursor: 'pointer', background: 'transparent', border: `1px solid ${t.border}`, color: '#f87171', fontSize: 11, fontWeight: 600, borderRadius: 6 }}
        >✕</button>
      </div>
    </div>
  );
}
