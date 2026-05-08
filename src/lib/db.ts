import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Local dev:    DATABASE_URL=file:./dev.db                  (SQLite, default driver)
// Production:   DATABASE_URL=libsql://your-db.turso.io      (Turso via libSQL adapter)
//               DATABASE_AUTH_TOKEN=...                     (Turso auth token)

const url = process.env.DATABASE_URL ?? '';
const isCloud = url.startsWith('libsql:');

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const log: any = process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'];
  if (isCloud) {
    const adapter = new PrismaLibSQL({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter, log });
  }
  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
