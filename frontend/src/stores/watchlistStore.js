import { create } from 'zustand';

export const useWatchlistStore = create((set, get) => ({
  entries: [
    { animeId: 4, status: 'watching' },
    { animeId: 11, status: 'completed' },
    { animeId: 1, status: 'want' },
    { animeId: 9, status: 'completed' },
  ],
  myLists: [
    { id: 'ml1', name: 'My Favorites', desc: 'The ones that hit different', isPublic: true, animeIds: [4, 11], followers: 12 },
  ],

  upsertEntry: (animeId, status) =>
    set((s) => {
      const exists = s.entries.find((e) => e.animeId === animeId);
      return {
        entries: exists
          ? s.entries.map((e) => (e.animeId === animeId ? { ...e, status } : e))
          : [...s.entries, { animeId, status }],
      };
    }),

  removeEntry: (animeId) =>
    set((s) => ({ entries: s.entries.filter((e) => e.animeId !== animeId) })),

  getEntry: (animeId) => get().entries.find((e) => e.animeId === animeId),

  createList: (list) =>
    set((s) => ({
      myLists: [...s.myLists, { id: `ml-${Date.now()}`, followers: 0, ...list }],
    })),

  updateList: (id, updates) =>
    set((s) => ({ myLists: s.myLists.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),

  deleteList: (id) => set((s) => ({ myLists: s.myLists.filter((l) => l.id !== id) })),

  addAnimeToList: (listId, animeId) =>
    set((s) => ({
      myLists: s.myLists.map((l) =>
        l.id === listId && !l.animeIds.includes(animeId)
          ? { ...l, animeIds: [...l.animeIds, animeId] }
          : l,
      ),
    })),

  removeAnimeFromList: (listId, animeId) =>
    set((s) => ({
      myLists: s.myLists.map((l) =>
        l.id === listId ? { ...l, animeIds: l.animeIds.filter((id) => id !== animeId) } : l,
      ),
    })),
}));
