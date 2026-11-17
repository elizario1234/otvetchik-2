const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Сервер запущен: http://localhost:${config.port}`);
});
