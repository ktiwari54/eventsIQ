/** @type {import('/root/.npm/_npx/2778af9cee32ff87/node_modules/prisma/config').defineConfig} */
const { defineConfig } = require('/root/.npm/_npx/2778af9cee32ff87/node_modules/prisma/config');

module.exports = defineConfig({
  datasourceUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/eventsiq',
});
