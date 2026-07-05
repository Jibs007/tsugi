import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as authService from '../services/authService.js';
import { sendWelcomeEmail } from '../services/mailService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Google OAuth setup ───────────────────────────────────────────────────────
// Only register the strategy if credentials are configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await authService.upsertGoogleUser({
            googleId:    profile.id,
            email:       profile.emails[0].value,
            displayName: profile.displayName,
            avatarUrl:   profile.photos?.[0]?.value ?? null,
          });
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
}

// ─── Cookie helper ────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'tsugi_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, COOKIE_OPTS);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax' });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /api/auth/signup */
router.post('/signup', async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.signup(req.body);
    setRefreshCookie(res, refreshToken);
    sendWelcomeEmail(user); // fire-and-forget — never blocks or fails signup
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/refresh  — rotate refresh token, issue new access token */
router.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken, user } = await authService.refreshAccessToken(raw);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout */
router.post('/logout', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    await authService.logout(raw);
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ─── Google OAuth flow ────────────────────────────────────────────────────────

/** GET /api/auth/google */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

/** GET /api/auth/google/callback */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth` }),
  async (req, res, next) => {
    try {
      const user = req.user; // set by passport after upsertGoogleUser
      const { accessToken, refreshToken } = await authService.issueTokens(user);
      setRefreshCookie(res, refreshToken);
      // Redirect to frontend — it reads the access token once then discards the URL param
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
