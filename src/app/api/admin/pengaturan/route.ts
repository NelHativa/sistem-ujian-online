import { NextResponse } from 'next/server';
import { aksesAdmin } from '@/lib/adminApi';
import { GalatApi, jawabGalatApi } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { setPengaturan } from '@/lib/settings';

/** WAKTU-05: toleransi diatur Admin Utama. Juga sakelar fitur ganti password. Hanya bagian yang dikirim yang diubah. */
export async function POST(req: Request) {
  try {
    const a = await aksesAdmin();
    if (a.admin.peran !== 'UTAMA') throw new GalatApi(403, 'Hanya Admin Utama yang dapat mengubah pengaturan.');
    const b = await req.json();
    const diubah: Record<string, unknown> = {};

    if (b.toleransiEditMenit !== undefined || b.toleransiKumpulMenit !== undefined) {
      const edit = Math.round(Number(b.toleransiEditMenit));
      const kumpul = Math.round(Number(b.toleransiKumpulMenit));
      if (!(edit >= 0 && edit <= 30) || !(kumpul > edit && kumpul <= 60)) throw new GalatApi(400, 'Toleransi kumpul harus lebih besar dari toleransi edit (maks. 60 menit).');
      await setPengaturan('toleransiEditMenit', edit);
      await setPengaturan('toleransiKumpulMenit', kumpul);
      Object.assign(diubah, { toleransiEditMenit: edit, toleransiKumpulMenit: kumpul });
    }

    if (b.gantiPasswordAktif !== undefined) {
      if (typeof b.gantiPasswordAktif !== 'boolean') throw new GalatApi(400, 'Permintaan tidak valid.');
      await setPengaturan('gantiPasswordAktif', b.gantiPasswordAktif);
      diubah.gantiPasswordAktif = b.gantiPasswordAktif;
    }

    if (Object.keys(diubah).length === 0) throw new GalatApi(400, 'Tidak ada pengaturan yang diubah.');
    await catatLog({ kode: 'PENGATURAN_DIUBAH', aktorTipe: 'ADMIN', aktorId: a.admin.id, data: diubah, ctx: konteksDari(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
