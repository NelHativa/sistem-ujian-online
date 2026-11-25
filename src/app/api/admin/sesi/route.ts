import { NextResponse } from 'next/server';
import { seedAcak } from '@/lib/acak';
import { aksesAdmin, aksesSesiAdmin } from '@/lib/adminApi';
import { prisma } from '@/lib/db';
import { GalatApi, jawabGalatApi } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { tokenUnik } from '@/lib/token';

function waktuWIB(tanggal: string, jam: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !/^\d{2}:\d{2}$/.test(jam)) throw new GalatApi(400, 'Tanggal atau jam tidak valid.');
  return new Date(`${tanggal}T${jam}:00+07:00`);
}

/** Membuat sesi ujian Reguler (SESI-01) atau Susulan (SUS-01..03). */
export async function POST(req: Request) {
  try {
    const a = await aksesAdmin();
    const b = await req.json();
    const mulai = waktuWIB(String(b.tanggal), String(b.jamMulai));
    const selesai = waktuWIB(String(b.tanggal), String(b.jamSelesai));
    if (selesai <= mulai) throw new GalatApi(400, 'Jam selesai harus setelah jam mulai.');
    const batas = Math.max(0, Math.min(120, Math.round(Number(b.batasTerlambat ?? 10))));
    const tipe = b.tipe === 'SUSULAN' ? 'SUSULAN' : 'REGULER';

    let paketId: number;
    let siswaIds: number[];
    let kelasIds: number[];
    let sesiIndukId: number | null = null;

    if (tipe === 'SUSULAN') {
      const { sesi: induk } = await aksesSesiAdmin(Number(b.sesiIndukId));
      sesiIndukId = induk.id;
      paketId = induk.paketId;
      const dipilih = (Array.isArray(b.siswaIds) ? b.siswaIds : []).map(Number);
      if (!dipilih.length) throw new GalatApi(400, 'Pilih minimal satu siswa.');
      const pesertaInduk = await prisma.pesertaSesi.findMany({ where: { sesiId: induk.id, siswaId: { in: dipilih } }, include: { siswa: true } });
      // SUS-03: siswa yang sudah mengumpulkan pada sesi reguler mapel & jenis ujian yang sama tidak boleh ikut susulan.
      const sudah = await prisma.pesertaSesi.findMany({
        where: {
          siswaId: { in: dipilih },
          jamKumpul: { not: null },
          sesi: { paket: { mapelId: induk.paket.mapelId, jenisUjian: induk.paket.jenisUjian } },
        },
        include: { siswa: true },
      });
      if (sudah.length) throw new GalatApi(409, `Sudah mengumpulkan, tidak dapat ikut susulan: ${sudah.map((s) => s.siswa.nama).join(', ')}.`);
      siswaIds = pesertaInduk.map((p) => p.siswaId);
      kelasIds = [...new Set(pesertaInduk.map((p) => p.siswa.kelasId))];
    } else {
      paketId = Number(b.paketId);
      const paket = await prisma.paketSoal.findUnique({ where: { id: paketId } });
      if (!paket) throw new GalatApi(400, 'Pilih paket soal.');
      kelasIds = (Array.isArray(b.kelasIds) ? b.kelasIds : []).map(Number);
      if (!kelasIds.length) throw new GalatApi(400, 'Pilih minimal satu kelas peserta.');
      const kelas = await prisma.kelas.findMany({ where: { id: { in: kelasIds } } });
      if (kelas.some((k) => !a.grupIds.includes(k.grupId))) throw new GalatApi(403, 'Ada kelas di luar grup Anda.');
      if (kelas.some((k) => k.tingkat !== paket.tingkat)) throw new GalatApi(400, `Paket ini untuk kelas ${paket.tingkat}. Pilih kelas dengan tingkat yang sama.`);
      siswaIds = (await prisma.siswa.findMany({ where: { kelasId: { in: kelasIds } }, select: { id: true } })).map((s) => s.id);
    }

    const token = await tokenUnik(mulai, selesai);
    const sesi = await prisma.sesiUjian.create({
      data: {
        paketId,
        tipe,
        mulai,
        selesai,
        batasTerlambatMenit: batas,
        token,
        sesiIndukId,
        kelas: { create: kelasIds.map((kelasId) => ({ kelasId })) },
        peserta: { create: siswaIds.map((siswaId) => ({ siswaId, seed: seedAcak() })) },
      },
    });
    await catatLog({ kode: 'SESI_DIBUAT', aktorTipe: 'ADMIN', aktorId: a.admin.id, sesiId: sesi.id, data: { tipe, peserta: siswaIds.length }, ctx: konteksDari(req) });
    return NextResponse.json({ id: sesi.id });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
