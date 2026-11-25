import { NextResponse } from 'next/server';
import { aksesSesiAdmin } from '@/lib/adminApi';
import { prisma } from '@/lib/db';
import { GalatApi, jawabGalatApi } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { tokenDipakaiSesiLain, tokenUnik } from '@/lib/token';

/** Tindakan admin (PANTAU-04, SESI-04). Setiap tindakan dicatat. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin, sesi } = await aksesSesiAdmin(Number((await params).id));
    const ctx = konteksDari(req);
    const b = await req.json();
    const aktor = { aktorTipe: 'ADMIN' as const, aktorId: admin.id, sesiId: sesi.id, ctx };
    const now = new Date();

    const ambilPeserta = async () => {
      const p = await prisma.pesertaSesi.findFirst({ where: { id: Number(b.pesertaId), sesiId: sesi.id }, include: { siswa: true } });
      if (!p) throw new GalatApi(404, 'Peserta tidak ditemukan.');
      return p;
    };

    switch (b.aksi) {
      case 'RESET_LOGIN': {
        const p = await ambilPeserta();
        await prisma.sesiLogin.updateMany({ where: { akunTipe: 'SISWA', akunId: p.siswaId, aktif: true }, data: { aktif: false } });
        await catatLog({ ...aktor, kode: 'RESET_LOGIN', pesertaId: p.id, data: { admin: admin.username, siswa: p.siswa.nama } });
        return NextResponse.json({ ok: true, pesan: `Login ${p.siswa.nama} direset. Siswa dapat login di perangkat lain dan melanjutkan jawabannya.` });
      }
      case 'PAKSA_KUMPUL': {
        const p = await ambilPeserta();
        if (!p.jamMasuk || p.jamKumpul) throw new GalatApi(409, 'Siswa ini belum masuk ujian atau sudah mengumpulkan.');
        await prisma.pesertaSesi.update({ where: { id: p.id }, data: { jamKumpul: now, caraKumpul: 'PAKSA_ADMIN', sedangKeluarSejak: null } });
        await catatLog({ ...aktor, kode: 'KUMPUL_PAKSA_ADMIN', pesertaId: p.id, data: { admin: admin.username } });
        return NextResponse.json({ ok: true, pesan: `Jawaban ${p.siswa.nama} dikumpulkan paksa.` });
      }
      case 'PAKSA_KUMPUL_SEMUA': {
        const list = await prisma.pesertaSesi.findMany({ where: { sesiId: sesi.id, jamMasuk: { not: null }, jamKumpul: null } });
        for (const p of list) {
          await prisma.pesertaSesi.update({ where: { id: p.id }, data: { jamKumpul: now, caraKumpul: 'PAKSA_ADMIN', sedangKeluarSejak: null } });
          await catatLog({ ...aktor, kode: 'KUMPUL_PAKSA_ADMIN', pesertaId: p.id, data: { admin: admin.username, seluruhSesi: true } });
        }
        return NextResponse.json({ ok: true, pesan: `${list.length} siswa dikumpulkan paksa.` });
      }
      case 'TOKEN_BUAT_ULANG':
      case 'TOKEN_EDIT': {
        let token: string;
        if (b.aksi === 'TOKEN_EDIT') {
          token = String(b.token ?? '').trim();
          if (!/^\d{6}$/.test(token)) throw new GalatApi(400, 'Token harus tepat 6 digit angka.');
          if (await tokenDipakaiSesiLain(token, sesi.mulai, sesi.selesai, sesi.id)) throw new GalatApi(409, 'Token sudah dipakai sesi lain yang waktunya bersamaan.');
        } else token = await tokenUnik(sesi.mulai, sesi.selesai, sesi.id);
        await prisma.sesiUjian.update({ where: { id: sesi.id }, data: { token } });
        await catatLog({ ...aktor, kode: 'TOKEN_DIUBAH', data: { admin: admin.username, cara: b.aksi === 'TOKEN_EDIT' ? 'manual' : 'buat ulang', lama: sesi.token, baru: token } });
        return NextResponse.json({ ok: true, token, pesan: `Token diubah menjadi ${token}. Token lama tidak berlaku lagi bagi siswa yang belum masuk.` });
      }
      default:
        throw new GalatApi(400, 'Aksi tidak dikenal.');
    }
  } catch (e) {
    return jawabGalatApi(e);
  }
}
