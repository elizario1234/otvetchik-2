# Ответчик

Учебный веб-проект. Зарегистрированный пользователь задаёт вопрос, сайт находит ответ в интернете и показывает его. Если вопрос сложный, ответ объясняется простыми словами. История вопросов и ответов сохраняется.

## Статус

- Готова архитектура: [docs/architecture.md](docs/architecture.md)
- Готова база данных (схема Prisma) и вход на сервере: регистрация, вход, выход, «кто я»
- Не готово: вопросы и ответы, клиент на React, подключение внешнего сервиса для ответов

## Стек

- Клиент: React (Vite), пока не создан
- Сервер: Node.js + Express
- База данных: PostgreSQL + Prisma
- Ответы: внешний сервис по API (выбор обсуждается с преподавателем)

## Запуск сервера

1. Установите Node.js 20.6 или новее и PostgreSQL.
2. Создайте пустую базу данных в PostgreSQL.
3. В папке `server/` скопируйте `.env.example` в `.env` и заполните `DATABASE_URL` и `JWT_SECRET` (длинная случайная строка).
4. Выполните:

```bash
cd server
npm install
npx prisma migrate dev --name init
npm run dev
```

Сервер запустится на http://localhost:3000.

## Что уже работает

| Метод | Адрес | Что делает |
|---|---|---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Кто я |

## Структура

```text
otvetchik/
├── docs/
│   └── architecture.md
├── server/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── database/
│       ├── middleware/
│       ├── config/
│       └── utils/
├── .gitignore
└── README.md
```
