-- Tsugi v1 schema
-- Run via: node src/db/migrate.js

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT,                          -- null for OAuth-only accounts
  google_id     TEXT        UNIQUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Watchlist entries ────────────────────────────────────────────────────────
-- anime_id is the MAL / Jikan integer ID; we store metadata in Redis, not here.
CREATE TABLE IF NOT EXISTS watchlist_entries (
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id      INTEGER     NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('watching','want','completed','dropped')),
  progress      INTEGER     NOT NULL DEFAULT 0,   -- episodes watched
  rating        SMALLINT             CHECK (rating BETWEEN 1 AND 10),
  notes         TEXT,
  started_at    DATE,
  finished_at   DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

-- ─── Shareable lists ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lists (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,
  -- slug is the human-readable share handle, e.g. "gateway-anime-a3f2"
  slug          TEXT        UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Anime in a list (ordered) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS list_anime (
  list_id       UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  anime_id      INTEGER     NOT NULL,
  position      INTEGER     NOT NULL DEFAULT 0,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, anime_id)
);

-- ─── List follows ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS list_follows (
  list_id       UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, user_id)
);

-- ─── Refresh tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT        NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlist_user     ON watchlist_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status   ON watchlist_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lists_user         ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_public_slug  ON lists(slug) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_list_follows_list  ON list_follows(list_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_exp ON refresh_tokens(expires_at);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN VALUES ('users'),('watchlist_entries'),('lists') LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_touch_%1$s ON %1$s;
       CREATE TRIGGER trg_touch_%1$s BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION touch_updated_at();', t);
  END LOOP;
END $$;
