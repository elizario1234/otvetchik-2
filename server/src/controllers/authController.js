// Слой controllers: берут данные из запроса, вызывают сервис, отвечают
const authService = require('../services/authService');
const config = require('../config');

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript на странице не прочитает эту cookie
  sameSite: 'lax',
  secure: config.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { user, token } = await authService.register(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).end();
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me };
