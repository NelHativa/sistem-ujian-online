import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; walReady?: boolean };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
  // WAL membuat banyak siswa menyimpan jawaban bersamaan tanpa saling mengunci terlalu lama.
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => undefined);
  prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;').catch(() => undefined);
}
