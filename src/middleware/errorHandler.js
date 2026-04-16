/**
 * Central error handler — mount LAST in Express pipeline
 * Usage: app.use(errorHandler)
 */
const errorHandler = (err, req, res, _next) => {
  // Log full stack in dev, minimal in prod
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n❌  Error:', err.stack);
  } else {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  }

  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
    });
  }

  // Multer unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }

  // JWT errors (shouldn't reach here usually, but safety net)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired.', code: 'TOKEN_EXPIRED' });
  }

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry — this record already exists.' });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  // Postgres check constraint
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Data failed a database constraint check.' });
  }

  // Express JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  // Express body too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  // Known HTTP status errors (e.g. thrown manually)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Fallback — 500
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
};

/**
 * Async wrapper — avoids try/catch boilerplate in route handlers
 * Usage: router.get('/', asyncHandler(myController))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };