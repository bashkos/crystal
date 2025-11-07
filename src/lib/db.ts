import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with connection error handling
const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test database connection on startup
if (typeof window === 'undefined') {
  prisma.$connect().catch((error) => {
    console.error('Database connection error:', error)
    console.warn('Application will continue but database operations may fail.')
    console.warn('Please ensure DATABASE_URL is correct and database is accessible.')
  })
}