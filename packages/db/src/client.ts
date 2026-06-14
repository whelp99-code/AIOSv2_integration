import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['query' as const] : [],
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

// Re-export Prisma types for convenience
export type { PrismaClient } from '@prisma/client'
export { Prisma } from '@prisma/client'
