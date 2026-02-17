// lib/prisma.ts
import { PrismaClient } from '@prisma/client';   // ← import classique, rien à changer
import { PrismaNeon } from '@prisma/adapter-neon';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env');
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma 
  || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}