# Tsugi 次

An anime watchlist app powered by the [Jikan API](https://jikan.moe/) (MyAnimeList data).

**Stack:** React + Vite · Express · PostgreSQL · Redis · Docker

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| Docker Desktop | latest |
| npm | 9 + |

---

## Running Locally

### Option A — Frontend + Backend dev servers (recommended for development)

**1. Start the infrastructure (Postgres + Redis)**

```bash
docker compose up -d
```

**2. Set up the backend**

```bash
cd backend
cp .env.example .env        # edit values if needed (defaults work for local dev)
npm install
node src/db/migrate.js      # creates tables
npm run dev                 # starts on http://localhost:4000
```

**3. Set up the frontend**

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5174
```

Open [http://localhost:5174](http://localhost:5174).

> The Vite dev server proxies `/api/*` requests to `http://localhost:4000` automatically.

---

### Option B — Full Docker stack (closest to production)

```bash
docker compose --profile app up --build
```

- Frontend → [http://localhost](http://localhost) (port 80, nginx)
- Backend  → [http://localhost:4000](http://localhost:4000)
- Postgres → `localhost:5432`
- Redis    → `localhost:6379`

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
PORT=4000
DATABASE_URL=postgresql://tsugi:tsugi@localhost:5432/tsugi
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me_in_production_please   # ← change this

# Optional — only needed for Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

CLIENT_URL=http://localhost:5174
```

> The defaults in `.env.example` work against the Docker Compose infrastructure out of the box.

---

## Database

Tables are created by `backend/src/db/schema.sql`.  
Run migrations manually:

```bash
cd backend
node src/db/migrate.js
```

The Docker Compose `postgres` service mounts `schema.sql` as an init script, so the schema is applied automatically on first run.

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Register with email + password |
| `POST` | `/api/auth/login` | Login, returns access token + sets cookie |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Clear session |
| `GET`  | `/api/auth/google` | Start Google OAuth flow |
| `GET`  | `/api/anime/top` | Top anime (by popularity) |
| `GET`  | `/api/anime/search?q=&genres=&status=` | Search anime |
| `GET`  | `/api/anime/:id` | Anime detail |
| `GET`  | `/api/anime/:id/recommendations` | Recommendations |
| `GET`  | `/api/watchlist` | Get current user's watchlist |
| `PUT`  | `/api/watchlist/:animeId` | Add / update entry |
| `DELETE` | `/api/watchlist/:animeId` | Remove entry |
| `GET`  | `/api/lists` | Get all lists |
| `POST` | `/api/lists` | Create a list |
| `PUT`  | `/api/lists/:id` | Update a list |
| `DELETE` | `/api/lists/:id` | Delete a list |

---

## Project Structure

```
tsugi/
├── backend/
│   ├── src/
│   │   ├── db/          # schema.sql, migrate.js, pool
│   │   ├── middleware/  # auth, error handler
│   │   ├── routes/      # auth, anime, watchlist, lists
│   │   ├── services/    # authService, animeService (Jikan proxy + Redis cache)
│   │   └── index.js
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # AnimeCard, AnimeCover, StatusBadge, AuthModal, …
│   │   ├── hooks/       # useAnime (TanStack Query wrappers)
│   │   ├── lib/         # api.js (axios), constants.js
│   │   ├── pages/       # Discover, Detail, Search, Watchlist, Lists, Profile
│   │   └── stores/      # auth, watchlist, theme, ui (Zustand)
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## How live data works

Anime data flows:

```
Browser → /api/anime/* (Express) → Redis cache → Jikan API (MAL)
```

- Cache TTLs: detail 6 h · search 30 min · top 1 h · seasonal 30 min
- Jikan rate limit (3 req/s) is handled by a token-bucket queue in `animeService.js`
- The frontend uses TanStack Query with `MOCK_ANIME` as `placeholderData`, so the UI is never blank — real data replaces mock data once the first API response arrives

---

## Themes

Three built-in themes (toggle in the sidebar):

| Name | Vibe |
|------|------|
| **Dusk** | Deep violet, default |
| **Slate** | Cool blue-grey |
| **Ember** | Warm coral |
