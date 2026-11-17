// Слой routes: связывает адрес и функцию
const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Не больше 10 попыток входа за 15 минут (защита от подбора паролей)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS' },
});

router.post('/register', controller.register);
router.post('/login', loginLimiter, controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
