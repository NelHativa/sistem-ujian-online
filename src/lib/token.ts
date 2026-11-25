import { randomInt } from 'crypto';
import { prisma } from './db';

/** SESI-03: token 6 digit, unik di antara sesi yang waktunya beririsan. */
export async function tokenUnik(mulai: Date, selesai: Date, kecualiSesiId?: number) {
  const bentrok = await prisma.sesiUjian.findMany({
    where: {
      mulai: { lt: new Date(selesai.getTime() + 60 * 60_000) },
      selesai: { gt: new Date(mulai.getTime() - 60 * 60_000) },
      ...(kecualiSesiId ? { id: { not: kecualiSesiId } } : {}),
    },
    select: { token: true },
  });
  const terpakai = new Set(bentrok.map((b) => b.token));
  for (let i = 0; i < 50; i++) {
    const t = String(randomInt(0, 1_000_000)).padStart(6, '0');
    if (!terpakai.has(t)) return t;
  }
  throw new Error('Gagal membuat token unik');
}

export async function tokenDipakaiSesiLain(token: string, mulai: Date, selesai: Date, sesiId: number) {
  const n = await prisma.sesiUjian.count({
    where: {
      token,
      id: { not: sesiId },
      mulai: { lt: new Date(selesai.getTime() + 60 * 60_000) },
      selesai: { gt: new Date(mulai.getTime() - 60 * 60_000) },
    },
  });
  return n > 0;
}
