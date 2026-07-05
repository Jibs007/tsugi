import { create } from 'zustand';
import { watchlistApi, listsApi } from '../lib/api';

export const useWatchlistStore = create((set, get) => ({
  entries: [],
  myLists: [],

  // ── Hydrate from backend ──────────────────────────────────────────────────
  loadWatchlist: async () => {
    try {
      const rows = await watchlistApi.getAll();
      set({
        entries: rows.map((r) => ({
          animeId:  r.anime_id,
          status:   r.status,
          progress: r.progress ?? 0,
          rating:   r.rating   ?? null,
        })),
      });
    } catch { /* not logged in or network error */ }
  },

  loadMyLists: async () => {
    try {
      const rows = await listsApi.getAll();
      set({
        myLists: rows.map((r) => ({
          id:       r.id,
          name:     r.name,
          desc:     r.description ?? '',
          isPublic: r.is_public,
          animeIds: r.anime_ids   ?? [],
          followers: Number(r.followers) || 0,
        })),
      });
    } catch { /* not logged in or network error */ }
  },

  // ── Watchlist CRUD (optimistic + backend sync) ────────────────────────────
  // `fields` is either a status string ('watching') or a partial patch
  // ({ progress: 5 }, { rating: 8 }, { status, progress }, …).
  upsertEntry: async (animeId, fields) => {
    const patch = typeof fields === 'string' ? { status: fields } : { ...fields };
    const existing = get().entries.find((e) => e.animeId === animeId);
    // Backend requires a status on every upsert — reuse the current one for
    // progress/rating-only updates.
    const status = patch.status ?? existing?.status ?? 'watching';

    set((s) => ({
      entries: existing
        ? s.entries.map((e) => (e.animeId === animeId ? { ...e, ...patch, status } : e))
        : [...s.entries, { animeId, progress: 0, rating: null, ...patch, status }],
    }));
    try { await watchlistApi.upsert(animeId, { ...patch, status }); } catch { /* non-critical */ }
  },

  removeEntry: async (animeId) => {
    set((s) => ({ entries: s.entries.filter((e) => e.animeId !== animeId) }));
    try { await watchlistApi.remove(animeId); } catch { /* non-critical */ }
  },

  getEntry: (animeId) => get().entries.find((e) => e.animeId === animeId),

  // ── Lists CRUD ────────────────────────────────────────────────────────────
  createList: async (data) => {
    const row = await listsApi.create({ name: data.name, desc: data.desc, isPublic: data.isPublic });
    // Persist any anime picked before the list existed
    const animeIds = data.animeIds ?? [];
    for (const animeId of animeIds) {
      try { await listsApi.addAnime(row.id, animeId); } catch { /* keep going */ }
    }
    const list = {
      id: row.id, name: row.name,
      desc: row.description ?? '',
      isPublic: row.is_public,
      animeIds,
      followers: 0,
    };
    set((s) => ({ myLists: [...s.myLists, list] }));
    return list;
  },

  updateList: async (id, updates) => {
    const current = get().myLists.find((l) => l.id === id);
    await listsApi.update(id, { name: updates.name, desc: updates.desc, isPublic: updates.isPublic });

    // Sync anime membership changes (diff against what we had)
    if (updates.animeIds && current) {
      const before = new Set(current.animeIds);
      const after  = new Set(updates.animeIds);
      for (const animeId of updates.animeIds) {
        if (!before.has(animeId)) {
          try { await listsApi.addAnime(id, animeId); } catch { /* keep going */ }
        }
      }
      for (const animeId of current.animeIds) {
        if (!after.has(animeId)) {
          try { await listsApi.rmAnime(id, animeId); } catch { /* keep going */ }
        }
      }
    }
    set((s) => ({ myLists: s.myLists.map((l) => (l.id === id ? { ...l, ...updates } : l)) }));
  },

  deleteList: async (id) => {
    set((s) => ({ myLists: s.myLists.filter((l) => l.id !== id) }));
    try { await listsApi.remove(id); } catch { /* non-critical */ }
  },

  addAnimeToList: async (listId, animeId) => {
    set((s) => ({
      myLists: s.myLists.map((l) =>
        l.id === listId && !l.animeIds.includes(animeId)
          ? { ...l, animeIds: [...l.animeIds, animeId] }
          : l,
      ),
    }));
    try { await listsApi.addAnime(listId, animeId); } catch { /* non-critical */ }
  },

  removeAnimeFromList: async (listId, animeId) => {
    set((s) => ({
      myLists: s.myLists.map((l) =>
        l.id === listId ? { ...l, animeIds: l.animeIds.filter((id) => id !== animeId) } : l,
      ),
    }));
    try { await listsApi.rmAnime(listId, animeId); } catch { /* non-critical */ }
  },

  // ── Reset on logout ───────────────────────────────────────────────────────
  clearAll: () => set({ entries: [], myLists: [] }),
}));
