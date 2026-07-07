import { create } from 'zustand';
import { THEME } from '../lib/constants';

// Dusk is the only theme (hardcoded). The Grid/List card style is the one
// UI preference, persisted in localStorage under tsugi_card_style.
const CARD_STYLE_KEY = 'tsugi_card_style';

function readCardStyle() {
  try {
    return localStorage.getItem(CARD_STYLE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export const useThemeStore = create((set) => ({
  theme: THEME,
  cardStyle: readCardStyle(),
  setCardStyle: (style) => {
    try { localStorage.setItem(CARD_STYLE_KEY, style); } catch {}
    set({ cardStyle: style });
  },
}));
