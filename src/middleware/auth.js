const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// Blocks request if no valid JWT
const requireAuth = async (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token)
    return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id,username,email,is_active FROM users WHERE id=$1',
      [payload.userId]
    );
    if (!rows[0] || !rows[0].is_active)
      return res.status(401).json({ error: 'Account not found or suspended.' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error:'Token expired.', code:'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Attaches user if token exists, but doesn't block if missing
const optionalAuth = async (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await db.query(
        'SELECT id,username,email,is_active FROM users WHERE id=$1',
        [payload.userId]
      );
      if (rows[0]?.is_active) req.user = rows[0];
    } catch (_) {}
  }
  next();
};

module.exports = { requireAuth, optionalAuth };