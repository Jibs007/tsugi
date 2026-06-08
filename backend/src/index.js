import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import authRoutes      from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import listsRoutes     from './routes/lists.js';
import animeRoutes     from './routes/anime.js';
import { prewarmCache } from './services/animeService.js';

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/lists',     listsRoutes);
app.use('/api/anime',     animeRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🎌 Tsugi API → http://localhost:${PORT}`);
  prewarmCache(); // fire-and-forget
});
