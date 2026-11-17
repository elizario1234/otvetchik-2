// Единственное место, где создаётся подключение к базе (слой database)
const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient();
