import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { aksesAdmin } from '@/lib/adminApi';
import { kelasIdsAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GalatApi, jawabGalatApi } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { getPengaturan } from '@/lib/settings';

/**
 * Admin mengembalikan password siswa/guru ke tanggal lahir (YYYYMMDD) bila pemilik akun lupa.
 * Admin Grup hanya untuk siswa di grupnya; password guru hanya dapat direset Admin Utama.
 */
export async function POST(req: Request) {
  try {
    const a = await aksesAdmin();
    if (!(await getPengaturan()).gantiPasswordAktif) throw new GalatApi(403, 'Fitur ganti password sedang dinonaktifkan.');
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    if (!Number.isInteger(id)) throw new GalatApi(400, 'Permintaan tidak valid.');

    let nama: string;
    if (b.tipe === 'SISWA') {
      const s = await prisma.siswa.findUnique({ where: { id } });
      if (!s) throw new GalatApi(404, 'Siswa tidak ditemukan.');
      if (!(await kelasIdsAdmin(a.grupIds)).includes(s.kelasId)) throw new GalatApi(403, 'Siswa ini di luar grup Anda.');
      await prisma.siswa.update({ where: { id }, data: { passwordHash: await bcrypt.hash(s.tglLahir, 10) } });
      nama = s.nama;
    } else if (b.tipe === 'GURU') {
      if (a.admin.peran !== 'UTAMA') throw new GalatApi(403, 'Hanya Admin Utama yang dapat mereset password guru.');
      const g = await prisma.guru.findUnique({ where: { id } });
      if (!g) throw new GalatApi(404, 'Guru tidak ditemukan.');
      await prisma.guru.update({ where: { id }, data: { passwordHash: await bcrypt.hash(g.tglLahir, 10) } });
      nama = g.nama;
    } else {
      throw new GalatApi(400, 'Permintaan tidak valid.');
    }

    await catatLog({ kode: 'PASSWORD_DIRESET', aktorTipe: 'ADMIN', aktorId: a.admin.id, data: { tipe: b.tipe, id, nama }, ctx: konteksDari(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
