// Заглушка ИИ-сервиса: отдаёт готовый ответ без интернета и без ключа.
// Нужна, чтобы проект работал на защите, даже если настоящий сервис недоступен.
// Вход: вопрос, язык и история сообщений (в MVP всегда пустая). Выход: ответ и источники.
async function ask({ text, language }) {
  const answers = {
    RU: 'Это тестовый ответ. Настоящий ИИ-сервис сейчас отключён.',
    EN: 'This is a test answer. The real AI service is turned off.',
    KK: 'Бұл сынақ жауабы. Нақты ИИ-сервис қазір өшірулі.',
  };
  return {
    text: `${answers[language] || answers.RU} (Вопрос: ${text})`,
    language,
    isSimplified: true,
    sources: [{ url: 'https://example.com', title: 'Тестовый источник' }],
  };
}

module.exports = { ask };
