import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const ACCESS_TTL  = process.env.JWT_EXPIRES_IN  || '15m';
const REFRESH_TTL = process.env.REFRESH_EXPIRES_IN || '30d';
const REFRESH_MS  = 30 * 24 * 60 * 60 * 1000;

// ─── Token helpers ────────────────────────────────────────────────────────────

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL },
  );
}

async function createRefreshToken(userId, client) {
  const raw  = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const exp  = new Date(Date.now() + REFRESH_MS);

  await (client || pool).query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, exp],
  );
  return raw; // send the raw value to the client
}

function safeUser(row) {
  const { password_hash: _, ...safe } = row;
  return safe;
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup({ username, email, password }) {
  if (!username || !email || !password) throw Object.assign(new Error('username, email and password are required'), { status: 400 });

  const hash = await bcrypt.hash(password, 12);

  let user;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, created_at`,
      [username.trim(), email.toLowerCase().trim(), hash],
    );
    user = rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('email') ? 'email' : 'username';
      throw Object.assign(new Error(`That ${field} is already taken`), { status: 409 });
    }
    throw err;
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('email and password are required'), { status: 400 });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const row = rows[0];

  if (!row || !row.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const user = safeUser(row);
  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

// ─── Refresh access token ─────────────────────────────────────────────────────

export async function refreshAccessToken(rawToken) {
  if (!rawToken) throw Object.assign(new Error('Refresh token required'), { status: 400 });

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const { rows } = await pool.query(
    `SELECT rt.*, u.id as uid, u.username, u.email, u.avatar_url
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
    [hash],
  );

  if (!rows[0]) throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });

  const row = rows[0];

  // Rotate: delete old, issue new
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
    const newRefresh = await createRefreshToken(row.uid, client);
    await client.query('COMMIT');

    const user = { id: row.uid, username: row.username, email: row.email, avatar_url: row.avatar_url };
    return { accessToken: signAccessToken(user), refreshToken: newRefresh, user };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Issue both tokens (shared helper) ───────────────────────────────────────

export async function issueTokens(user) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user),
    createRefreshToken(user.id),
  ]);
  return { accessToken, refreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(rawToken) {
  if (!rawToken) return;
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
}

// ─── Google OAuth upsert ──────────────────────────────────────────────────────
// Called by Passport after Google verifies the user.

export async function upsertGoogleUser({ googleId, email, displayName, avatarUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, username, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET avatar_url = EXCLUDED.avatar_url,
           email      = EXCLUDED.email
     RETURNING id, username, email, avatar_url, created_at`,
    [googleId, email.toLowerCase(), displayName.replace(/\s+/g, '_').slice(0, 30), avatarUrl],
  );
  return rows[0];
}

// ─── Get user by id ───────────────────────────────────────────────────────────

export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, username, email, avatar_url, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

// ─── Prune expired refresh tokens (run on a cron) ────────────────────────────

export async function pruneExpiredTokens() {
  const { rowCount } = await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  return rowCount;
}
