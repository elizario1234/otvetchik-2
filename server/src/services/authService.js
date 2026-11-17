// Слой services: здесь живут бизнес-правила (R-3, R-4, R-7)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../database/client');
const config = require('../config');
const AppError = require('../utils/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Что отдаём наружу: без password_hash!
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    uiLanguage: user.uiLanguage,
  };
}

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function register({ email, password, name }) {
  const errors = [];
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) errors.push('Неверный формат почты');
  if (typeof password !== 'string' || password.length < 8) errors.push('Пароль короче 8 символов');
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    errors.push('Имя должно быть от 1 до 100 символов');
  }
  if (errors.length) throw new AppError(400, 'VALIDATION', errors);

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email: email.trim().toLowerCase(), passwordHash, name: name.trim() },
    });
    return { user: publicUser(user), token: makeToken(user) };
  } catch (err) {
    // P2002 — код Prisma «такое значение уже есть» (почта не уникальна)
    if (err.code === 'P2002') throw new AppError(409, 'EMAIL_TAKEN');
    throw err;
  }
}

async function login({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'VALIDATION', ['Укажите почту и пароль']);
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  // Одно и то же сообщение и для «нет такой почты», и для «неверный пароль»
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordOk) throw new AppError(401, 'WRONG_CREDENTIALS');
  if (user.isBlocked) throw new AppError(403, 'USER_BLOCKED');

  return { user: publicUser(user), token: makeToken(user) };
}

async function getCurrentUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isBlocked) throw new AppError(401, 'NOT_LOGGED_IN');
  return publicUser(user);
}

module.exports = { register, login, getCurrentUser };
