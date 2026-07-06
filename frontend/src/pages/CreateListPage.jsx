import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimeCover from '../components/AnimeCover';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useThemeStore } from '../stores/themeStore';
import { useAnimeSearch, useAnimeDetail } from '../hooks/useAnime';

export default function CreateListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme: t } = useThemeStore();
  const { myLists, createList, updateList } = useWatchlistStore();

  const editList = id ? myLists.find((l) => l.id === id) : null;
  const isEdit = !!id;

  const [name, setName]       = useState(editList?.name || '');
  const [desc, setDesc]       = useState(editList?.desc || '');
  const [isPublic, setIsPublic] = useState(editList?.isPublic ?? true);
  const [animeIds, setAnimeIds] = useState(editList?.animeIds || []);
  const [search, setSearch]   = useState('');
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  // On a direct reload of /lists/:id/edit, myLists loads asynchronously —
  // populate the form once the list arrives instead of silently treating
  // the edit as a brand-new list.
  useEffect(() => {
    if (editList) {
      setName(editList.name);
      setDesc(editList.desc);
      setIsPublic(editList.isPublic);
      setAnimeIds(editList.animeIds);
    }
  }, [editList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce so we don't fire a search per keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const { data: searchData, isLoading: searching } = useAnimeSearch(
    debouncedSearch ? { q: debouncedSearch, limit: 8 } : {},
  );
  const searchResults = searchData?.items ?? [];

  const inputStyle = {
    width: '100%', background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 8, padding: '11px 14px', color: t.text,
    fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await updateList(id, { name, desc, isPublic, animeIds });
      else await createList({ name, desc, isPublic, animeIds });
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/lists'); }, 1200);
    } catch (err) {
      setError(err?.error || 'Could not save the list — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && !editList) {
    return (
      <div style={{ padding: '36px 40px', color: t.textMuted, fontSize: 14 }} className="animate-fade-in">
        Loading list…
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 680 }} className="animate-fade-in">
      <button
        onClick={() => navigate('/lists')}
        style={{ background: 'transparent', border: 'none', color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ fontWeight: 800, fontSize: 26, color: t.text, marginBottom: 28 }}>
        {isEdit ? 'Edit List' : 'Create List'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>List Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Binge" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this list about?" rows={3}
            style={{ ...inputStyle, resize: 'none' }}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />
        </div>

        {/* Privacy toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted }}>Visibility</span>
          <div
            onClick={() => setIsPublic((p) => !p)}
            style={{ width: 48, height: 24, borderRadius: 12, cursor: 'pointer', background: isPublic ? t.accent : t.surface2, border: `1px solid ${t.border}`, position: 'relative', transition: 'background .2s' }}
          >
            <div style={{ position: 'absolute', top: 3, left: isPublic ? 26 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: isPublic ? t.accent : t.textMuted }}>{isPublic ? 'Public' : 'Private'}</span>
        </div>

        {/* Add anime search */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Add Anime</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search to add anime..." style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = t.accent)} onBlur={(e) => (e.target.style.borderColor = t.border)} />

          {searching && search.trim() && (
            <div style={{ padding: '8px 12px', fontSize: 13, color: t.textMuted }}>Searching…</div>
          )}

          {!searching && searchResults.map((anime) => (
            <div
              key={anime.id}
              onClick={() => { if (!animeIds.includes(anime.id)) setAnimeIds((ids) => [...ids, anime.id]); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginTop: 4, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
            >
              <AnimeCover anime={anime} width={36} height={50} style={{ borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{anime.title}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{anime.jp}</div>
              </div>
              {animeIds.includes(anime.id) && <span style={{ color: t.accent2 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Selected anime */}
        {animeIds.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>In this list ({animeIds.length})</div>
            {animeIds.map((animeId) => (
              <SelectedAnimeItem
                key={animeId}
                animeId={animeId}
                t={t}
                onRemove={() => setAnimeIds((ids) => ids.filter((i) => i !== animeId))}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        {error && (
          <div style={{ background: '#f8717122', border: '1px solid #f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            style={{
              flex: 1, padding: '13px', background: saved ? '#22c55e' : t.accent, border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
              opacity: !name.trim() || saving ? 0.6 : 1, transition: 'background .2s, opacity .15s',
            }}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedAnimeItem({ animeId, t, onRemove }) {
  const { data: anime, isLoading } = useAnimeDetail(animeId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 6 }}>
        <div style={{ width: 36, height: 50, background: t.surface2, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1, height: 14, background: t.surface2, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  if (!anime) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 6 }}>
      <AnimeCover anime={anime} width={36} height={50} style={{ borderRadius: 4 }} />
      <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: t.text }}>{anime.title}</div>
      <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  );
}
