import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NAMA_COOKIE, Peran } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';

const LOGIN: Record<Peran, string> = { SISWA: '/', GURU: '/guru', ADMIN: '/admin' };

export async function POST(req: Request) {
  const { peran } = (await req.json().catch(() => ({}))) as { peran: Peran };
  if (!LOGIN[peran]) return NextResponse.json({ ok: false }, { status: 400 });
  const jar = await cookies();
  const sid = jar.get(NAMA_COOKIE[peran])?.value;
  if (sid) {
    const s = await prisma.sesiLogin.findUnique({ where: { id: sid } });
    if (s?.aktif) {
      await prisma.sesiLogin.update({ where: { id: sid }, data: { aktif: false } });
      await catatLog({ kode: 'LOGOUT', aktorTipe: peran, aktorId: s.akunId, ctx: konteksDari(req) });
    }
  }
  jar.delete(NAMA_COOKIE[peran]);
  return NextResponse.json({ ok: true, tujuan: LOGIN[peran] });
}
