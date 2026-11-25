import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { Peran, adminLogin, guruLogin, siswaLogin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GalatApi, jawabGalatApi } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { validasiPasswordBaru } from '@/lib/password';
import { getPengaturan } from '@/lib/settings';

async function akunLogin(peran: Peran) {
  if (peran === 'SISWA') {
    const a = await siswaLogin();
    return a && { id: a.siswa.id, hash: a.siswa.passwordHash };
  }
  if (peran === 'GURU') {
    const a = await guruLogin();
    return a && { id: a.guru.id, hash: a.guru.passwordHash };
  }
  const a = await adminLogin();
  return a && { id: a.admin.id, hash: a.admin.passwordHash };
}

async function simpanHash(peran: Peran, id: number, passwordHash: string) {
  if (peran === 'SISWA') await prisma.siswa.update({ where: { id }, data: { passwordHash } });
  else if (peran === 'GURU') await prisma.guru.update({ where: { id }, data: { passwordHash } });
  else await prisma.admin.update({ where: { id }, data: { passwordHash } });
}

/** Pemilik akun mengganti password sendiri. Hanya berlaku bila fitur dinyalakan Admin Utama. */
export async function POST(req: Request) {
  try {
    if (!(await getPengaturan()).gantiPasswordAktif) throw new GalatApi(403, 'Fitur ganti password sedang dinonaktifkan.');
    const b = await req.json().catch(() => ({}));
    const peran = b.peran as Peran;
    if (!['SISWA', 'GURU', 'ADMIN'].includes(peran)) throw new GalatApi(400, 'Permintaan tidak valid.');
    const akun = await akunLogin(peran);
    if (!akun) throw new GalatApi(401, 'Sesi login berakhir. Silakan login kembali.');

    const lama = String(b.passwordLama ?? '');
    const baru = String(b.passwordBaru ?? '');
    if (!(await bcrypt.compare(lama, akun.hash))) throw new GalatApi(400, 'Password lama salah.');
    const galat = validasiPasswordBaru(baru);
    if (galat) throw new GalatApi(400, galat);

    await simpanHash(peran, akun.id, await bcrypt.hash(baru, 10));
    await catatLog({ kode: 'PASSWORD_DIUBAH', aktorTipe: peran, aktorId: akun.id, ctx: konteksDari(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
