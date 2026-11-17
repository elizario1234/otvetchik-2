// Проверка входа (правило R-1): смотрим подпись токена из cookie
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

module.exports = function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return next(new AppError(401, 'NOT_LOGGED_IN'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'NOT_LOGGED_IN'));
  }
};
