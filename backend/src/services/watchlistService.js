import pool from '../db/pool.js';

// ─── Get full watchlist for a user ────────────────────────────────────────────

export async function getWatchlist(userId) {
  const { rows } = await pool.query(
    `SELECT anime_id, status, progress, rating, notes, started_at, finished_at, updated_at
     FROM watchlist_entries
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows;
}

// ─── Upsert a single entry ────────────────────────────────────────────────────
// Merges partial updates — only overwrites fields that are explicitly passed.

export async function upsertEntry(userId, animeId, fields) {
  const { status, progress, rating, notes, started_at, finished_at } = fields;

  if (!status) throw Object.assign(new Error('status is required'), { status: 400 });

  const VALID = ['watching', 'want', 'completed', 'dropped'];
  if (!VALID.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${VALID.join(', ')}`), { status: 400 });
  }

  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
    throw Object.assign(new Error('rating must be an integer between 1 and 10'), { status: 400 });
  }

  if (progress != null && (!Number.isInteger(progress) || progress < 0)) {
    throw Object.assign(new Error('progress must be a non-negative integer'), { status: 400 });
  }

  // Partial-update semantics: fields the caller didn't send stay untouched.
  // The raw params (not EXCLUDED.*) are used in DO UPDATE — EXCLUDED reflects
  // the VALUES row, where NULLs have already been defaulted for the insert.
  const { rows } = await pool.query(
    `INSERT INTO watchlist_entries
       (user_id, anime_id, status, progress, rating, notes, started_at, finished_at)
     VALUES ($1, $2, $3, COALESCE($4, 0), $5, $6, $7, $8)
     ON CONFLICT (user_id, anime_id) DO UPDATE SET
       status      = $3,
       progress    = COALESCE($4, watchlist_entries.progress),
       rating      = COALESCE($5, watchlist_entries.rating),
       notes       = COALESCE($6, watchlist_entries.notes),
       started_at  = COALESCE($7, watchlist_entries.started_at),
       finished_at = COALESCE($8, watchlist_entries.finished_at),
       updated_at  = NOW()
     RETURNING *`,
    [userId, animeId, status, progress ?? null, rating ?? null, notes ?? null, started_at ?? null, finished_at ?? null],
  );

  return rows[0];
}

// ─── Delete a single entry ────────────────────────────────────────────────────

export async function removeEntry(userId, animeId) {
  const { rowCount } = await pool.query(
    'DELETE FROM watchlist_entries WHERE user_id = $1 AND anime_id = $2',
    [userId, animeId],
  );
  return rowCount > 0;
}

// ─── Stats summary ────────────────────────────────────────────────────────────

export async function getStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       status,
       COUNT(*)::int                          AS count,
       COALESCE(SUM(progress), 0)::int        AS episodes_watched,
       ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 1)::float AS avg_rating
     FROM watchlist_entries
     WHERE user_id = $1
     GROUP BY status`,
    [userId],
  );

  const base = { watching: 0, want: 0, completed: 0, dropped: 0 };
  const byStatus = rows.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), base);
  const totalEps = rows.reduce((s, r) => s + r.episodes_watched, 0);
  const ratings  = rows.filter((r) => r.avg_rating).map((r) => r.avg_rating);
  const avgRating = ratings.length ? +(ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : null;

  return { byStatus, totalEpisodes: totalEps, avgRating };
}
