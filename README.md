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

### First-time setup (once only)

```bash
# 1. Install all dependencies
npm run install:all

# 2. Copy env file and run migrations
cp backend/.env.example backend/.env
cd backend && node src/db/migrate.js && cd ..
```

### Daily dev (2 commands)

```bash
# Terminal 1 — infrastructure (Postgres + Redis)
docker compose up -d

# Terminal 2 — both servers together
npm run dev
```

That's it. The root `npm run dev` uses `concurrently` to start:
- **Backend** on http://localhost:4000 (Express)
- **Frontend** on http://localhost:5174 (Vite — proxies `/api/*` to the backend)

Logs from both are colour-coded in the same terminal (`cyan` = backend, `magenta` = frontend).

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
| `GET`  | `/api/anime/top?filter=` | Top anime — no filter = top rated; `bypopularity`, `airing`, `upcoming`, `favorite` |
| `GET`  | `/api/anime/search?q=&genres=&status=` | Search anime (MAL relevance order when `q` is given) |
| `GET`  | `/api/anime/genres` | All MAL genres/themes/demographics |
| `GET`  | `/api/anime/seasonal/now` | Currently airing season |
| `GET`  | `/api/anime/:id` | Anime detail (trailer, relations, streaming links) |
| `GET`  | `/api/anime/:id/characters` | Main characters + Japanese VAs |
| `GET`  | `/api/anime/:id/recommendations` | Recommendations |
| `GET`  | `/api/watchlist` | Get current user's watchlist |
| `PUT`  | `/api/watchlist/:animeId` | Add / update entry (partial: `status`, `progress`, `rating`, …) |
| `DELETE` | `/api/watchlist/:animeId` | Remove entry |
| `GET`  | `/api/lists` | Get your lists |
| `GET`  | `/api/lists/public` | Browse public lists (includes `is_following`) |
| `POST` | `/api/lists` | Create a list |
| `PUT`  | `/api/lists/:id` | Update a list (owner only) |
| `DELETE` | `/api/lists/:id` | Delete a list (owner only) |
| `POST` | `/api/lists/:id/anime` | Add anime to a list (owner only) |
| `POST` / `DELETE` | `/api/lists/:id/follow` | Follow / unfollow a public list |

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

- Cache TTLs: detail 24 h · search 1 h · top 3 h · seasonal 30 min · genres 24 h
- Jikan rate limit (3 req/s) is handled by a token-bucket queue in `animeService.js`, with capped backoff on 429s
- Cache keys are versioned (`anime:v2:*`) — bump the version when the normalised shape changes
- The frontend uses TanStack Query; skeleton loaders cover the first fetch

---

## Themes

Three built-in themes (toggle via the ◐ button, bottom-right):

| Name | Vibe |
|------|------|
| **Dusk** | Deep violet, default |
| **Slate** | Cool blue-grey |
| **Ember** | Warm coral |
