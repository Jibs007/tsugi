import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public lists — no auth required
router.get('/public', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.username as author,
              array_agg(la.anime_id ORDER BY la.position) FILTER (WHERE la.anime_id IS NOT NULL) as anime_ids,
              COUNT(lf.user_id) as followers
       FROM lists l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN list_anime la ON la.list_id = l.id
       LEFT JOIN list_follows lf ON lf.list_id = l.id
       WHERE l.is_public = true
       GROUP BY l.id, u.username
       ORDER BY followers DESC, l.created_at DESC
       LIMIT 50`,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// View a single list (public or owned)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.username as author,
              array_agg(la.anime_id ORDER BY la.position) FILTER (WHERE la.anime_id IS NOT NULL) as anime_ids
       FROM lists l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN list_anime la ON la.list_id = l.id
       WHERE l.id = $1 AND (l.is_public = true OR l.user_id = $2)
       GROUP BY l.id, u.username`,
      [req.params.id, req.user?.id ?? null],
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
      `SELECT l.*,
              array_agg(la.anime_id ORDER BY la.position) FILTER (WHERE la.anime_id IS NOT NULL) as anime_ids,
              COUNT(lf.user_id) as followers
       FROM lists l
       LEFT JOIN list_anime la ON la.list_id = l.id
       LEFT JOIN list_follows lf ON lf.list_id = l.id
       WHERE l.user_id = $1
       GROUP BY l.id
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
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      'INSERT INTO lists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, desc, isPublic],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, desc, isPublic } = req.body;
    const { rows } = await pool.query(
      `UPDATE lists SET name = COALESCE($1, name), description = COALESCE($2, description),
       is_public = COALESCE($3, is_public), updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name, desc, isPublic, req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/anime', async (req, res, next) => {
  try {
    const { animeId } = req.body;
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
    await pool.query('DELETE FROM list_anime WHERE list_id = $1 AND anime_id = $2', [req.params.id, req.params.animeId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/follow', async (req, res, next) => {
  try {
    await pool.query('INSERT INTO list_follows (list_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/follow', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM list_follows WHERE list_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
