import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GalatApi, aksesPaket, jawabGalatApi, normalSoal } from '@/lib/guruApi';
import { catatLog, konteksDari } from '@/lib/log';
import { paketTerkunci, validasiPaket } from '@/lib/paket';

type Ctx = { params: Promise<{ id: string }> };

/** Tambah soal. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const id = Number((await params).id);
    await aksesPaket(id, true);
    const s = normalSoal(await req.json());
    const max = await prisma.soal.aggregate({ where: { paketId: id }, _max: { nomor: true } });
    const soal = await prisma.soal.create({
      data: {
        paketId: id,
        nomor: (max._max.nomor ?? 0) + 1,
        tipe: s.tipe,
        teks: s.teks,
        bobot: s.bobot,
        hitungan: s.hitungan,
        pedoman: s.pedoman,
        gambar: JSON.stringify(s.gambar),
        opsi: { create: s.opsi.map((o, urutan) => ({ ...o, urutan })) },
      },
    });
    return NextResponse.json({ id: soal.id });
  } catch (e) {
    return jawabGalatApi(e);
  }
}

/** Finalkan / batalkan Final (SOAL-08, SOAL-09). */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const id = Number((await params).id);
    const { guru } = await aksesPaket(id, false);
    const { aksi } = await req.json();
    const ctx = konteksDari(req);
    if (aksi === 'FINAL') {
      const soal = await prisma.soal.findMany({ where: { paketId: id }, include: { opsi: true }, orderBy: { nomor: 'asc' } });
      const v = validasiPaket(soal);
      if (v.masalah.length) return NextResponse.json({ pesan: 'Paket belum lengkap.', masalah: v.masalah }, { status: 400 });
      await prisma.paketSoal.update({ where: { id }, data: { status: 'FINAL', finalAt: new Date() } });
      await catatLog({ kode: 'PAKET_FINAL', aktorTipe: 'GURU', aktorId: guru.id, data: { paketId: id }, ctx });
      return NextResponse.json({ ok: true });
    }
    if (aksi === 'DRAF') {
      if (await paketTerkunci(id)) throw new GalatApi(409, 'Paket sudah terkunci karena sesi yang memakainya telah dimulai.');
      await prisma.paketSoal.update({ where: { id }, data: { status: 'DRAF', finalAt: null } });
      await catatLog({ kode: 'PAKET_DRAF', aktorTipe: 'GURU', aktorId: guru.id, data: { paketId: id }, ctx });
      return NextResponse.json({ ok: true });
    }
    throw new GalatApi(400, 'Aksi tidak dikenal.');
  } catch (e) {
    return jawabGalatApi(e);
  }
}
