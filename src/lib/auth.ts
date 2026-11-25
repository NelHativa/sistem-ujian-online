import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';

export type Peran = 'SISWA' | 'GURU' | 'ADMIN';

export const NAMA_COOKIE: Record<Peran, string> = {
  SISWA: 'sid_siswa',
  GURU: 'sid_guru',
  ADMIN: 'sid_admin',
};

/** AUTH-09: sesi login dianggap kedaluwarsa setelah tidak aktif selama ini. */
export const BATAS_TIDAK_AKTIF_MS = 120 * 60_000;

export function sesiMasihAktif(s: { aktif: boolean; lastSeen: Date }) {
  return s.aktif && Date.now() - s.lastSeen.getTime() < BATAS_TIDAK_AKTIF_MS;
}

export function idSesiBaru() {
  return randomBytes(24).toString('hex');
}

async function sesiLoginDariCookie(peran: Peran) {
  const jar = await cookies();
  const sid = jar.get(NAMA_COOKIE[peran])?.value;
  if (!sid) return null;
  const s = await prisma.sesiLogin.findUnique({ where: { id: sid } });
  if (!s || s.akunTipe !== peran || !sesiMasihAktif(s)) return null;
  if (Date.now() - s.lastSeen.getTime() > 30_000) {
    await prisma.sesiLogin.update({ where: { id: sid }, data: { lastSeen: new Date() } });
  }
  return s;
}

export async function siswaLogin() {
  const s = await sesiLoginDariCookie('SISWA');
  if (!s) return null;
  const siswa = await prisma.siswa.findUnique({ where: { id: s.akunId }, include: { kelas: true } });
  return siswa ? { sesiLogin: s, siswa } : null;
}

export async function guruLogin() {
  const s = await sesiLoginDariCookie('GURU');
  if (!s) return null;
  const guru = await prisma.guru.findUnique({
    where: { id: s.akunId },
    include: { penugasan: { include: { mapel: true, kelas: true } } },
  });
  return guru ? { sesiLogin: s, guru } : null;
}

export async function adminLogin() {
  const s = await sesiLoginDariCookie('ADMIN');
  if (!s) return null;
  const admin = await prisma.admin.findUnique({ where: { id: s.akunId }, include: { grup: true } });
  if (!admin) return null;
  const grupIds =
    admin.peran === 'UTAMA'
      ? (await prisma.grupKelas.findMany({ select: { id: true } })).map((g) => g.id)
      : admin.grup.map((g) => g.grupId);
  return { sesiLogin: s, admin, grupIds };
}

export async function wajibSiswa() {
  const a = await siswaLogin();
  if (!a) redirect('/');
  return a;
}

export async function wajibGuru() {
  const a = await guruLogin();
  if (!a) redirect('/guru');
  return a;
}

export async function wajibAdmin() {
  const a = await adminLogin();
  if (!a) redirect('/admin');
  return a;
}

/** Id kelas yang boleh diakses admin (berdasarkan grupnya). */
export async function kelasIdsAdmin(grupIds: number[]) {
  const kelas = await prisma.kelas.findMany({ where: { grupId: { in: grupIds } }, select: { id: true } });
  return kelas.map((k) => k.id);
}
