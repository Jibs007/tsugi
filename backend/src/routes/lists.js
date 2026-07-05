import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Correlated subqueries (not JOIN + GROUP BY) so followers and anime_ids
// can't cross-multiply: joining list_anime × list_follows inflates follower
// counts by the number of anime and duplicates every anime_id per follower.
const LIST_FIELDS = `
  l.*,
  COALESCE((SELECT array_agg(la.anime_id ORDER BY la.position)
            FROM list_anime la WHERE la.list_id = l.id), '{}') AS anime_ids,
  (SELECT COUNT(*)::int FROM list_follows lf WHERE lf.list_id = l.id) AS followers,
  EXISTS(SELECT 1 FROM list_follows lf
         WHERE lf.list_id = l.id AND lf.user_id = $1) AS is_following`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validListId(req, res) {
  if (!UUID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid list id' });
    return false;
  }
  return true;
}

async function assertOwner(listId, userId) {
  const { rows } = await pool.query('SELECT 1 FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);
  if (!rows[0]) throw Object.assign(new Error('List not found'), { status: 404 });
}

// Public lists — no auth required, but is_following is filled in when logged in
router.get('/public', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${LIST_FIELDS}, u.username AS author
       FROM lists l
       JOIN users u ON u.id = l.user_id
       WHERE l.is_public = true
       ORDER BY followers DESC, l.created_at DESC
       LIMIT 50`,
      [req.user?.id ?? null],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// View a single list (public or owned)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    const { rows } = await pool.query(
      `SELECT ${LIST_FIELDS}, u.username AS author
       FROM lists l
       JOIN users u ON u.id = l.user_id
       WHERE l.id = $2 AND (l.is_public = true OR l.user_id = $1)`,
      [req.user?.id ?? null, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'List not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// All endpoints below require auth
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${LIST_FIELDS}
       FROM lists l
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, desc, isPublic = true } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    if (name.trim().length > 100) return res.status(400).json({ error: 'name must be 100 characters or fewer' });
    const { rows } = await pool.query(
      'INSERT INTO lists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name.trim(), desc ?? null, Boolean(isPublic)],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    const { name, desc, isPublic } = req.body;
    if (name != null && (!name.trim() || name.trim().length > 100)) {
      return res.status(400).json({ error: 'name must be 1–100 characters' });
    }
    const { rows } = await pool.query(
      `UPDATE lists SET name = COALESCE($1, name), description = COALESCE($2, description),
       is_public = COALESCE($3, is_public), updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name?.trim(), desc, isPublic, req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    await pool.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/anime', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    const animeId = parseInt(req.body.animeId, 10);
    if (!Number.isFinite(animeId) || animeId <= 0) {
      return res.status(400).json({ error: 'animeId must be a positive integer' });
    }
    await assertOwner(req.params.id, req.user.id);
    await pool.query(
      `INSERT INTO list_anime (list_id, anime_id, position)
       VALUES ($1, $2, (SELECT COALESCE(MAX(position), 0) + 1 FROM list_anime WHERE list_id = $1))
       ON CONFLICT DO NOTHING`,
      [req.params.id, animeId],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/anime/:animeId', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    await assertOwner(req.params.id, req.user.id);
    await pool.query('DELETE FROM list_anime WHERE list_id = $1 AND anime_id = $2', [req.params.id, req.params.animeId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/follow', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    // Only public lists (or your own) can be followed
    const { rows } = await pool.query(
      'SELECT 1 FROM lists WHERE id = $1 AND (is_public = true OR user_id = $2)',
      [req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'List not found' });
    await pool.query('INSERT INTO list_follows (list_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/follow', async (req, res, next) => {
  try {
    if (!validListId(req, res)) return;
    await pool.query('DELETE FROM list_follows WHERE list_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
