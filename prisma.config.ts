import 'dotenv/config';  // ← Pour charger .env si besoin (installez npm install dotenv si pas déjà)
import { defineConfig, env } from '@prisma/config';  // ← Import depuis Prisma

export default defineConfig({
  schema: 'prisma/schema.prisma',  // ← Chemin vers votre schema
  migrations: {
    path: 'prisma/migrations',  // ← Chemin par défaut pour les migrations
  },
  datasource: {
    url: env('DATABASE_URL'),  // ← Votre URL Supabase ici via env
  },
});