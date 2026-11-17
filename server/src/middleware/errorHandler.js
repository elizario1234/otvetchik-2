const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: err.code };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  console.error(err); // подробности только в консоль сервера, не пользователю
  res.status(500).json({ error: 'INTERNAL' });
}

module.exports = { notFound, errorHandler };
