const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

// ─── Token helpers ─────────────────────────────────────────
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

// ─── Validation chains ──────────────────────────────────────
exports.validateRegister = [
  body('username')
    .trim().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Only letters, numbers, dots and underscores.'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('full_name').optional().trim().isLength({ max: 100 }),
];

exports.validateLogin = [
  body('login').notEmpty().withMessage('Email or username required.'),
  body('password').notEmpty(),
];

// ─── POST /api/auth/register ────────────────────────────────
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });

  const { username, email, password, full_name } = req.body;

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE username=$1 OR email=$2 LIMIT 1',
      [username.toLowerCase(), email]
    );
    if (existing.rows.length)
      return res.status(409).json({ error: 'Username or email already taken.' });

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

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

// ─── POST /api/auth/login ───────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });

  const { login, password } = req.body;

  try {
    const { rows } = await db.query(
      `SELECT id, username, email, password_hash, full_name,
              avatar_url, is_active
       FROM users
       WHERE email=$1 OR username=$1
       LIMIT 1`,
      [login.toLowerCase()]
    );

    const user = rows[0];
    if (!user || !user.is_active)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [user.id, hashToken(refreshToken)]
    );

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
};

// ─── POST /api/auth/refresh ─────────────────────────────────
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const { rows } = await db.query(
      `SELECT user_id FROM refresh_tokens
       WHERE token_hash=$1 AND expires_at > NOW() LIMIT 1`,
      [hashToken(refreshToken)]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });

    const userId = rows[0].user_id;

    // Rotate: delete old, issue new
    await db.query(
      'DELETE FROM refresh_tokens WHERE token_hash=$1',
      [hashToken(refreshToken)]
    );

    const { accessToken, refreshToken: newRefresh } = generateTokens(userId);
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '7 days')`,
      [userId, hashToken(newRefresh)]
    );

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token refresh failed.' });
  }
};

// ─── POST /api/auth/logout ──────────────────────────────────
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.query(
      'DELETE FROM refresh_tokens WHERE token_hash=$1',
      [hashToken(refreshToken)]
    );
  }
  res.json({ message: 'Logged out.' });
}