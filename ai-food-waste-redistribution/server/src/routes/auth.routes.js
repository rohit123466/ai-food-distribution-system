const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh, logout, me } = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again later.' },
});

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
