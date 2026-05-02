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
  slate: {
    name: 'Slate',
    bg: '#0d1117',
    bg2: '#161b24',
    surface: '#1c2230',
    surface2: '#212938',
    border: '#2d3650',
    accent: '#58a6ff',
    accent2: '#79c0ff',
    accentMuted: 'rgba(88,166,255,0.10)',
    text: '#e6edf3',
    textMuted: '#6e7d95',
    textDim: '#2d3748',
  },
  ember: {
    name: 'Ember',
    bg: '#110d0b',
    bg2: '#1a1210',
    surface: '#221816',
    surface2: '#2a1e1b',
    border: '#3a2820',
    accent: '#e06040',
    accent2: '#f0956a',
    accentMuted: 'rgba(224,96,64,0.12)',
    text: '#f0ece8',
    textMuted: '#907060',
    textDim: '#3a2820',
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

