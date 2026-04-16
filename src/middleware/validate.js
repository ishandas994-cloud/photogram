const { body, param, query, validationResult } = require('express-validator');

/**
 * Call this middleware after any validate* chain to return 422 on errors.
 */
const checkErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// ── Reusable field validators ───────────────────────────────────
const validators = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters.')
    .matches(/^[a-zA-Z0-9._]+$/).withMessage('Username may only contain letters, numbers, dots, underscores.'),

  email: body('email')
    .isEmail().withMessage('Valid email required.')
    .normalizeEmail(),

  password: body('password')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters.'),

  postCaption: body('caption')
    .optional()
    .trim()
    .isLength({ max: 2200 }).withMessage('Caption must be under 2200 characters.'),

  commentText: body('text')
    .trim()
    .isLength({ min: 1, max: 2200 }).withMessage('Comment must be 1–2200 characters.'),

  uuidParam: (field = 'id') =>
    param(field).isUUID().withMessage(`${field} must be a valid UUID.`),

  paginationQuery: [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
};

module.exports = { checkErrors, validators };