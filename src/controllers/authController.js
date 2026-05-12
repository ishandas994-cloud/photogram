const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// ─── Token helpers ───────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = uuidv4() + '-' + uuidv4();

  return { accessToken, refreshToken };
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ─── VALIDATION ──────────────────────────────────
exports.validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9._]+$/),

  body('email').isEmail().normalizeEmail(),

  body('password').isLength({ min: 8 }),

  body('full_name').optional().trim().isLength({ max: 100 }),
];

exports.validateLogin = [
  body('login').notEmpty(),
  body('password').notEmpty(),
];

// ─── REGISTER ────────────────────────────────────
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });

  try {
    const { username, email, password, full_name } = req.body;

    const existing = await db.query(
      `SELECT id FROM users WHERE username=$1 OR email=$2 LIMIT 1`,
      [username?.toLowerCase(), email]
    );

    if (existing.rows.length)
      return res.status(409).json({ error: 'Username or email already taken' });

    const hash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, email, full_name, avatar_url, created_at`,
      [username.toLowerCase(), email, hash, full_name || null]
    );

    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [user.id, hashToken(refreshToken)]
    );

    return res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

// ─── LOGIN (FIXED SAFE VERSION) ──────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });

  try {
    const login = (req.body?.login || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!login || !password)
      return res.status(400).json({ error: 'Login and password required' });

    const { rows } = await db.query(
      `SELECT id, username, email, password_hash, full_name,
              avatar_url, is_active
       FROM users
       WHERE email=$1 OR username=$1
       LIMIT 1`,
      [login]
    );

    const user = rows[0];

    if (!user || !user.is_active || !user.password_hash)
      return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [user.id, hashToken(refreshToken)]
    );

    const { password_hash, ...safeUser } = user;

    return res.json({
      user: safeUser,
      accessToken,
      refreshToken,
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

// ─── REFRESH TOKEN ───────────────────────────────
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token required' });

  try {
    const { rows } = await db.query(
      `SELECT user_id FROM refresh_tokens
       WHERE token_hash=$1 AND expires_at > NOW()`,
      [hashToken(refreshToken)]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Invalid refresh token' });

    const userId = rows[0].user_id;

    await db.query(
      `DELETE FROM refresh_tokens WHERE token_hash=$1`,
      [hashToken(refreshToken)]
    );

    const tokens = generateTokens(userId);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [userId, hashToken(tokens.refreshToken)]
    );

    return res.json(tokens);

  } catch (err) {
    console.error('REFRESH ERROR:', err);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
};

// ─── LOGOUT ──────────────────────────────────────
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (refreshToken) {
      await db.query(
        `DELETE FROM refresh_tokens WHERE token_hash=$1`,
        [hashToken(refreshToken)]
      );
    }

    return res.json({ message: 'Logged out' });

  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
};