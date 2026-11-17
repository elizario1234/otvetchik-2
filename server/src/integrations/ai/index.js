// Единственная точка входа в ИИ-сервис (слой integrations/ai).
// Какой сервис работает, выбирает переменная AI_PROVIDER из .env.
const providers = {
  mock: require('./mock'),
  // Настоящий сервис добавится здесь, когда его выберут вместе с преподавателем:
  // gemini: require('./gemini'),
};

function getProvider() {
  const name = process.env.AI_PROVIDER || 'mock';
  const provider = providers[name];
  if (!provider) throw new Error(`Неизвестный AI_PROVIDER: ${name}`);
  return provider;
}

module.exports = { ask: (params) => getProvider().ask(params) };
