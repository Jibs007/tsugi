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

export const MOCK_ANIME = [
  { id: 1,  title: 'Chainsaw Man',     jp: 'チェンソーマン',       color: '#ff4455', genres: ['Action','Horror','Supernatural'], status: 'completed', rating: 8.7, eps: 12,  year: 2022, studio: 'MAPPA',        desc: 'Denji hunts devils for the yakuza to pay crushing debts. Everything changes when his devil dog Pochita sacrifices himself to save him — fusing their bodies and granting Denji chainsaw powers.' },
  { id: 2,  title: 'Jujutsu Kaisen',   jp: '呪術廻戦',             color: '#6644ff', genres: ['Action','Supernatural'],          status: 'airing',    rating: 8.9, eps: 47,  year: 2020, studio: 'MAPPA',        desc: 'After swallowing a cursed talisman — the finger of a demon — Yuji Itadori enrolls in a shaman school to locate the demon\'s remaining fingers and exorcise himself before a death sentence is carried out.' },
  { id: 3,  title: 'Spy x Family',     jp: 'スパイファミリー',      color: '#ff9933', genres: ['Comedy','Action'],                status: 'airing',    rating: 8.6, eps: 37,  year: 2022, studio: 'WIT Studio',   desc: 'A spy, an assassin, and a telepath form a fake family — none knowing each other\'s secrets. All three must keep their true identities hidden while somehow making it work.' },
  { id: 4,  title: 'Frieren',          jp: '葬送のフリーレン',      color: '#44aaff', genres: ['Fantasy','Adventure'],            status: 'completed', rating: 9.3, eps: 28,  year: 2023, studio: 'Madhouse',     desc: 'The hero\'s party defeated the Demon King and returned. Elven mage Frieren, who barely ages, watches her companions grow old and pass on — and begins a journey to understand what it means to have truly lived.' },
  { id: 5,  title: 'Vinland Saga',     jp: 'ヴィンランド・サガ',   color: '#c8a840', genres: ['Historical','Action'],            status: 'completed', rating: 9.0, eps: 48,  year: 2019, studio: 'WIT Studio',   desc: 'Young Viking Thorfinn pursues a journey with his father\'s killer in order to take revenge. He witnesses the brutality of war and must decide what kind of man he will become.' },
  { id: 6,  title: 'Dungeon Meshi',    jp: 'ダンジョン飯',         color: '#44cc88', genres: ['Fantasy','Comedy'],               status: 'completed', rating: 9.0, eps: 24,  year: 2024, studio: 'Trigger',      desc: 'After losing their mage to a dungeon dragon, adventurer Laios leads his party back in — this time cooking and eating the monsters they encounter to survive and save her.' },
  { id: 7,  title: 'Solo Leveling',    jp: '俺だけレベルアップ',   color: '#3355ff', genres: ['Action','Fantasy'],               status: 'completed', rating: 8.5, eps: 12,  year: 2024, studio: 'A-1 Pictures', desc: 'In a world where hunters battle dangerous monsters, Sung Jinwoo — the weakest of all hunters — discovers a mysterious system only he can see, allowing him to grow endlessly stronger.' },
  { id: 8,  title: 'Re:Zero',          jp: 'リゼロ',               color: '#cc44cc', genres: ['Fantasy','Thriller'],             status: 'airing',    rating: 8.8, eps: 60,  year: 2016, studio: 'White Fox',    desc: 'Natsuki Subaru is summoned to another world with one peculiar ability: whenever he dies, time rewinds. He uses this brutal power to protect those he loves, at great personal cost.' },
  { id: 9,  title: 'Attack on Titan',  jp: '進撃の巨人',           color: '#c87820', genres: ['Action','Drama'],                 status: 'completed', rating: 9.1, eps: 87,  year: 2013, studio: 'MAPPA',        desc: 'Centuries after nearly being wiped out by giant humanoid Titans, humanity lives behind massive walls. Young Eren Yeager vows to avenge his mother after Titans breach the outer wall.' },
  { id: 10, title: 'Oshi no Ko',       jp: '推しの子',             color: '#ff66aa', genres: ['Drama','Mystery'],                status: 'airing',    rating: 8.7, eps: 23,  year: 2023, studio: 'Doga Kobo',    desc: 'A doctor reincarnated as the son of his favorite idol. When she is tragically murdered, he sets out to expose the truth behind her death from within the entertainment industry.' },
  { id: 11, title: 'Bocchi the Rock!', jp: 'ぼっち・ざ・ろっく！', color: '#ff44bb', genres: ['Slice of Life','Music'],          status: 'completed', rating: 9.0, eps: 12,  year: 2022, studio: 'Cloverworks',  desc: 'Hitori Gotou dreams of making friends through music, but her crippling social anxiety stands in the way. When she\'s invited to join a band, she must learn to perform — and connect — despite herself.' },
  { id: 12, title: 'Blue Lock',        jp: 'ブルーロック',         color: '#0066ff', genres: ['Sports','Action'],                status: 'airing',    rating: 8.4, eps: 24,  year: 2022, studio: 'Eight Bit',    desc: 'To create a world-class striker for Japan, 300 forwards are locked in a facility called Blue Lock. Only one will survive — and all must embrace a selfish, ego-driven style of soccer to win.' },
];

export const MOCK_LISTS = [
  { id: 1, name: 'Gateway Anime',     author: 'sakura_88',      followers: 2341, animeIds: [1,3,6,11], desc: 'The best anime to get your friends hooked',  isPublic: true },
  { id: 2, name: 'MAPPA Masterclass', author: 'otaku_prime',    followers: 891,  animeIds: [1,2,9],    desc: 'Every MAPPA production ranked and stacked',   isPublic: true },
  { id: 3, name: 'Cry Your Eyes Out', author: 'mel0drama',      followers: 3102, animeIds: [4,5,9,10], desc: 'Certified tear-jerkers only',                 isPublic: true },
  { id: 4, name: '2024 Season Hits',  author: 'season_watcher', followers: 445,  animeIds: [6,7],      desc: 'Best of 2024 wrapped',                        isPublic: true },
];
