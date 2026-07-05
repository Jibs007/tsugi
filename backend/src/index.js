import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import authRoutes      from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import listsRoutes     from './routes/lists.js';
import animeRoutes     from './routes/anime.js';
import { prewarmCache } from './services/animeService.js';
import { pruneExpiredTokens } from './services/authService.js';

const app  = express();
const PORT = process.env.PORT || 4000;

// Behind nginx in the Docker stack — trust the first proxy hop so
// express-rate-limit sees the real client IP.
app.set('trust proxy', 1);

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Throttle credential endpoints against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/lists',     listsRoutes);
app.use('/api/anime',     animeRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Malformed UUID/int in a query parameter is a client error, not a crash
  const status  = err.code === '22P02' ? 400 : (err.status || 500);
  const message = err.code === '22P02' ? 'Invalid identifier' : (err.message || 'Internal server error');
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🎌 Tsugi API → http://localhost:${PORT}`);
  prewarmCache(); // fire-and-forget

  // Clean out expired refresh tokens daily
  setInterval(() => {
    pruneExpiredTokens().catch((err) => console.warn('Token prune failed:', err.message));
  }, 24 * 60 * 60 * 1000).unref();
});
