export const THEMES = {
  dusk: {
    name: 'Dusk',
    bg: '#0e0e15',
    bg2: '#13131e',
    surface: '#1a1a28',
    surface2: '#21212f',
    border: '#2a2a3e',
    accent: '#7c6df4',
    accent2: '#a78bfa',
    accentMuted: 'rgba(124,109,244,0.12)',
    text: '#e8e8f8',
    textMuted: '#70709a',
    textDim: '#3a3a58',
  },
};

// MAL genre IDs for Jikan search — id: null means "no filter"
export const GENRES = [
  { name: 'All',          id: null },
  { name: 'Action',       id: 1    },
  { name: 'Fantasy',      id: 10   },
  { name: 'Drama',        id: 8    },
  { name: 'Comedy',       id: 4    },
  { name: 'Horror',       id: 14   },
  { name: 'Slice of Life',id: 36   },
  { name: 'Sports',       id: 30   },
  { name: 'Historical',   id: 13   },
  { name: 'Music',        id: 19   },
  { name: 'Supernatural', id: 37   },
  { name: 'Thriller',     id: 41   },
  { name: 'Mystery',      id: 7    },
  { name: 'Adventure',    id: 2    },
];

export const STATUS_LABELS = {
  watching: 'Watching',
  want: 'Want to Watch',
  completed: 'Completed',
  dropped: 'Dropped',
};

export const STATUS_COLORS = {
  watching: '#38bdf8',
  want: '#fbbf24',
  completed: '#4ade80',
  dropped: '#f87171',
};

