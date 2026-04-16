
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/authController');
const rateLimit  = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

// POST /api/auth/register
router.post('/register', limiter, ctrl.validateRegister, ctrl.register);

// POST /api/auth/login
router.post('/login',    limiter, ctrl.validateLogin,    ctrl.login);

// POST /api/auth/refresh
router.post('/refresh',  ctrl.refresh);

// POST /api/auth/logout
router.post('/logout',   ctrl.logout);

module.exports = router;