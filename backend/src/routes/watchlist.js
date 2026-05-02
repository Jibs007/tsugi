import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as wl from '../services/watchlistService.js';

const router = Router();
router.use(requireAuth);

/** GET /api/watchlist — full list for the authenticated user */
router.get('/', async (req, res, next) => {
  try {
    res.json(await wl.getWatchlist(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** GET /api/watchlist/stats — aggregate stats */
router.get('/stats', async (req, res, next) => {
  try {
    res.json(await wl.getStats(req.user.id));
  } catch (err) {
    next(err);
  }
});

/** PUT /api/watchlist/:animeId — add or update an entry */
router.put('/:animeId', async (req, res, next) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (!Number.isFinite(animeId)) return res.status(400).json({ error: 'animeId must be an integer' });
    const entry = await wl.upsertEntry(req.user.id, animeId, req.body);
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/watchlist/:animeId — remove an entry */
router.delete('/:animeId', async (req, res, next) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    const removed = await wl.removeEntry(req.user.id, animeId);
    res.json({ ok: removed });
  } catch (err) {
    next(err);
  }
});

export default router;
