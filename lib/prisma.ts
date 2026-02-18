// lib/prisma.ts
import 'dotenv/config' // si tu n'as pas déjà
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('❌ DATABASE_URL manquante dans .env')
}

// Singleton (très important avec Next.js pour éviter plusieurs instances)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const adapter = new PrismaNeon({ connectionString })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma