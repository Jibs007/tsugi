import axios from 'axios';

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,          // send/receive the httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Access-token injection ────────────────────────────────────────────────────
// The access token lives in memory (authStore) — NOT in localStorage — so it
// is never accessible to XSS. The request interceptor grabs the current value.

let _getAccessToken = () => null; // injected by authStore after initialisation

export function setTokenGetter(fn) {
  _getAccessToken = fn;
}

api.interceptors.request.use((config) => {
  const token = _getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Transparent token refresh ────────────────────────────────────────────────
// On a 401 we try /auth/refresh once (the httpOnly cookie carries the refresh
// token). If that succeeds we retry the original request with the new access
// token. A second 401 means the session is truly expired.

let _onRefreshSuccess = (_newToken) => {};   // injected by authStore
let _onRefreshFail    = ()           => {};  // injected by authStore

export function setRefreshCallbacks(onSuccess, onFail) {
  _onRefreshSuccess = onSuccess;
  _onRefreshFail    = onFail;
}

let refreshing = null; // deduplicate concurrent refresh attempts

// A 401 from these endpoints means "bad credentials / no session", not
// "expired access token" — refreshing would be pointless and would swallow
// the real error message (e.g. "Invalid email or password").
const NO_REFRESH = /\/auth\/(login|signup|refresh|logout)/;

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retried && !NO_REFRESH.test(original.url || '')) {
      original._retried = true;
      try {
        if (!refreshing) {
          refreshing = api.post('/auth/refresh').finally(() => { refreshing = null; });
        }
        const { accessToken } = await refreshing;
        _onRefreshSuccess(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        _onRefreshFail();
        return Promise.reject(err.response?.data || err);
      }
    }
    return Promise.reject(err.response?.data || err);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  signup:  (username, email, password) => api.post('/auth/signup', { username, email, password }),
  login:   (email, password)           => api.post('/auth/login',  { email, password }),
  logout:  ()                          => api.post('/auth/logout'),
  me:      ()                          => api.get('/auth/me'),
  refresh: ()                          => api.post('/auth/refresh'),
  /** Redirects — no axios call needed */
  googleLogin: () => { window.location.href = '/api/auth/google'; },
};

// ─── Anime (Jikan proxy) ──────────────────────────────────────────────────────

export const animeApi = {
  /** GET /api/anime/:id — full detail with relations, streaming links */
  getById: (id) => api.get(`/anime/${id}`),

  /** GET /api/anime/search?q=&genres=&status=&type=&order_by=&sort=&page=&min_score= */
  search: (params) => api.get('/anime/search', { params }),

  /** GET /api/anime/top?filter=bypopularity|airing|upcoming|favorite&type=tv&page= */
  top: (params) => api.get('/anime/top', { params }),

  /** GET /api/anime/seasonal/now */
  seasonalNow: (params) => api.get('/anime/seasonal/now', { params }),

  /** GET /api/anime/seasonal/:year/:season */
  season: (year, season, params) => api.get(`/anime/seasonal/${year}/${season}`, { params }),

  /** GET /api/anime/genres */
  genres: () => api.get('/anime/genres'),

  /** GET /api/anime/:id/recommendations */
  recommendations: (id) => api.get(`/anime/${id}/recommendations`),

  /** GET /api/anime/:id/characters */
  characters: (id) => api.get(`/anime/${id}/characters`),
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const watchlistApi = {
  /** GET /api/watchlist */
  getAll: () => api.get('/watchlist'),

  /** GET /api/watchlist/stats */
  stats: () => api.get('/watchlist/stats'),

  /**
   * PUT /api/watchlist/:animeId
   * body: { status, progress?, rating?, notes?, started_at?, finished_at? }
   */
  upsert: (animeId, fields) => api.put(`/watchlist/${animeId}`, fields),

  /** DELETE /api/watchlist/:animeId */
  remove: (animeId) => api.delete(`/watchlist/${animeId}`),
};

// ─── Lists ────────────────────────────────────────────────────────────────────

export const listsApi = {
  getAll:    ()               => api.get('/lists'),
  getPublic: ()               => api.get('/lists/public'),
  getById:   (id)             => api.get(`/lists/${id}`),
  create:    (data)           => api.post('/lists', data),
  update:    (id, data)       => api.put(`/lists/${id}`, data),
  remove:    (id)             => api.delete(`/lists/${id}`),
  addAnime:  (listId, animeId) => api.post(`/lists/${listId}/anime`, { animeId }),
  rmAnime:   (listId, animeId) => api.delete(`/lists/${listId}/anime/${animeId}`),
  follow:    (listId)         => api.post(`/lists/${listId}/follow`),
  unfollow:  (listId)         => api.delete(`/lists/${listId}/follow`),
};

export default api;
