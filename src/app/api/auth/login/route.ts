import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NAMA_COOKIE, Peran, idSesiBaru, sesiMasihAktif } from '@/lib/auth';
import { periksaCaptcha } from '@/lib/captcha';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { ringkasPerangkat } from '@/lib/perangkat';

const TUJUAN: Record<Peran, string> = { SISWA: '/ujian', GURU: '/guru/beranda', ADMIN: '/admin/beranda' };

export async function POST(req: Request) {
  const ctx = konteksDari(req);
  const body = await req.json().catch(() => ({}));
  const peran = body.peran as Peran;
  const idMasuk = String(body.id ?? '').trim();
  const password = String(body.password ?? '');
  if (!['SISWA', 'GURU', 'ADMIN'].includes(peran)) return NextResponse.json({ pesan: 'Permintaan tidak valid.' }, { status: 400 });

  const gagal = async (pesan: string, alasan: string, status = 401) => {
    await catatLog({ kode: 'LOGIN_GAGAL', aktorTipe: 'ANONIM', data: { peran, id: idMasuk, alasan }, ctx });
    return NextResponse.json({ pesan }, { status });
  };

  if (!(await periksaCaptcha(body.captchaId, body.captcha))) return gagal('Captcha salah. Silakan coba lagi.', 'captcha');

  let akunId: number | null = null;
  let hash: string | null = null;
  if (peran === 'SISWA') {
    const s = await prisma.siswa.findFirst({ where: { OR: [{ nisn: idMasuk }, { nis: idMasuk }] } });
    if (s) [akunId, hash] = [s.id, s.passwordHash];
  } else if (peran === 'GURU') {
    const g = await prisma.guru.findUnique({ where: { nomorInduk: idMasuk } });
    if (g) [akunId, hash] = [g.id, g.passwordHash];
  } else {
    const a = await prisma.admin.findUnique({ where: { username: idMasuk } });
    if (a) [akunId, hash] = [a.id, a.passwordHash];
  }
  if (akunId == null || !hash || !(await bcrypt.compare(password, hash))) {
    return gagal('ID atau password salah.', 'kredensial');
  }

  const jar = await cookies();
  const cookieLama = jar.get(NAMA_COOKIE[peran])?.value;
  const aktif = (await prisma.sesiLogin.findMany({ where: { akunTipe: peran, akunId, aktif: true } })).filter(sesiMasihAktif);

  if (peran === 'SISWA') {
    // AUTH-06: satu sesi aktif per akun siswa.
    const lain = aktif.filter((s) => s.id !== cookieLama);
    if (lain.length > 0) {
      await catatLog({
        kode: 'LOGIN_DITOLAK_SESI_AKTIF',
        aktorTipe: 'SISWA',
        aktorId: akunId,
        data: { id: idMasuk, perangkatAktif: lain[0].perangkat },
        ctx,
      });
      return NextResponse.json({ pesan: 'Akun sedang aktif di perangkat lain. Hubungi pengawas atau admin.' }, { status: 409 });
    }
    if (aktif.some((s) => s.id === cookieLama)) {
      return NextResponse.json({ ok: true, tujuan: TUJUAN[peran] });
    }
  } else {
    // Guru/admin: login terbaru menggantikan sesi sebelumnya.
    await prisma.sesiLogin.updateMany({ where: { akunTipe: peran, akunId, aktif: true }, data: { aktif: false } });
  }

  const id = idSesiBaru();
  await prisma.sesiLogin.create({
    data: { id, akunTipe: peran, akunId, ip: ctx.ip, perangkat: ringkasPerangkat(ctx.ua) },
  });
  await catatLog({ kode: 'LOGIN_BERHASIL', aktorTipe: peran, aktorId: akunId, data: { id: idMasuk }, ctx });

  jar.set(NAMA_COOKIE[peran], id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 12 * 60 * 60 });
  return NextResponse.json({ ok: true, tujuan: TUJUAN[peran] });
}
