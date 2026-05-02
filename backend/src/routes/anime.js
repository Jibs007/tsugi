import { Router } from 'express';
import * as anime from '../services/animeService.js';

const router = Router();

/**
 * GET /api/anime/top
 * ?filter=bypopularity|favorite|airing|upcoming|complete
 * &type=tv|movie|ova|special
 * &page=1&limit=24
 */
router.get('/top', async (req, res, next) => {
  try {
    res.json(await anime.getTop(req.query));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/genres
 * Returns all MAL genre objects { id, name, count }
 */
router.get('/genres', async (_req, res, next) => {
  try {
    res.json(await anime.getGenres());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/seasonal/now
 * ?page=1&limit=24
 */
router.get('/seasonal/now', async (req, res, next) => {
  try {
    res.json(await anime.getSeasonNow(req.query));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/seasonal/:year/:season
 * e.g. /seasonal/2024/winter
 */
router.get('/seasonal/:year/:season', async (req, res, next) => {
  try {
    const { year, season } = req.params;
    res.json(await anime.getSeason(year, season, req.query));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/search
 * ?q=&genres=1,2&status=airing&type=tv&order_by=score&sort=desc
 * &page=1&limit=24&min_score=7&max_score=10&rating=pg13
 */
router.get('/search', async (req, res, next) => {
  try {
    if (!req.query.q && !req.query.genres && !req.query.status && !req.query.type) {
      return res.status(400).json({ error: 'Provide at least one of: q, genres, status, type' });
    }
    res.json(await anime.search(req.query));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/:id/recommendations
 */
router.get('/:id/recommendations', async (req, res, next) => {
  try {
    res.json(await anime.getRecommendations(req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/anime/:id/cache  — bust stale cache for one title
 */
router.delete('/:id/cache', async (req, res, next) => {
  try {
    await anime.bustCache(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/anime/:id  — full anime detail (must be last — catches all /:id)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id must be an integer' });
    const result = await anime.getById(id);
    if (!result) return res.status(404).json({ error: 'Anime not found' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
