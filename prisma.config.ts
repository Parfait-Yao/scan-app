// prisma.config.ts
import 'dotenv/config';  // charge .env automatiquement

import { defineConfig } from 'prisma/config';

// Debug (supprime après avoir vu que ça marche)
console.log('Chargement dotenv OK');
console.log('DIRECT_URL :', process.env.DIRECT_URL);
console.log('DATABASE_URL_UNPOOLED :', process.env.DATABASE_URL_UNPOOLED);

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // Priorise DIRECT_URL, fallback sur UNPOOLED si absent
    url: process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || '',
  },
});