import { PrismaClient } from '@prisma/client'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma resolves relative SQLite paths against prisma/schema.prisma, but in a
// bundled serverless function that file no longer sits next to the database.
// Resolve against the project root instead (cwd locally, /var/task on Vercel)
// and fall back to the bundled db/custom.db when DATABASE_URL is unset.
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) return `file:${path.join(process.cwd(), 'db', 'custom.db')}`
  if (!url.startsWith('file:')) return url
  const file = url.slice('file:'.length)
  if (path.isAbsolute(file)) return url
  return `file:${path.resolve(process.cwd(), 'prisma', file)}`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
