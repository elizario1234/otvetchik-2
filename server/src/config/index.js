// Все настройки читаем в одном месте, из .env
const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`В файле .env не задана переменная ${name}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dailyQuestionLimit: Number(process.env.DAILY_QUESTION_LIMIT) || 20,
  isProduction: process.env.NODE_ENV === 'production',
};
