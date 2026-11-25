import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { GalatUjian, jawabGalat, konteksUjian } from '@/lib/ujianSiswa';
import { bolehUbahJawaban } from '@/lib/waktu';

type Item = { soalId: number; isi: unknown; ragu?: boolean };

function isiValid(tipe: string, isi: unknown, opsiIds: Set<number>) {
  if (isi === null) return true;
  if (tipe === 'ESAI') return typeof isi === 'string' && isi.length <= 10_000;
  if (tipe === 'PGK') return Array.isArray(isi) && isi.every((v) => typeof v === 'number' && opsiIds.has(v));
  return typeof isi === 'number' && opsiIds.has(isi);
}

/** Simpan jawaban (UJI-09). Menerima satu item atau antrean beberapa item dari mode offline (UJI-10). */
export async function PUT(req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const ctx = konteksDari(req);
    const k = await konteksUjian(Number(sesiId));
    const body = await req.json().catch(() => null);
    const items: Item[] = Array.isArray(body?.items) ? body.items : body ? [body] : [];
    const aktor = { aktorTipe: 'SISWA' as const, aktorId: k.login.siswa.id, pesertaId: k.peserta.id, sesiId: k.sesi.id, ctx };

    if (k.langkah !== 'KERJAKAN') {
      if (k.peserta.jamMasuk && !k.peserta.jamKumpul) {
        for (const it of items) {
          const s = await prisma.soal.findUnique({ where: { id: Number(it.soalId) }, select: { nomor: true } });
          await catatLog({ ...aktor, kode: 'JAWABAN_DITOLAK_WAKTU', data: { nomor: s?.nomor } });
        }
      }
      throw new GalatUjian(409, 'Jawaban tidak dapat diubah lagi.', k.peserta.jamKumpul ? 'SUDAH_KUMPUL' : 'TERKUNCI');
    }

    if (!bolehUbahJawaban(k.fase)) {
      // WAKTU-02: penguncian ditegakkan di server.
      for (const it of items) {
        const s = await prisma.soal.findFirst({ where: { id: Number(it.soalId), paketId: k.sesi.paketId }, select: { nomor: true } });
        await catatLog({ ...aktor, kode: 'JAWABAN_DITOLAK_WAKTU', data: { nomor: s?.nomor } });
      }
      return NextResponse.json(
        { pesan: 'Waktu edit sudah habis. Jawaban terkunci, silakan tekan Kumpulkan.', kode: 'TERKUNCI', serverNow: k.now.toISOString() },
        { status: 409 },
      );
    }

    const soalList = await prisma.soal.findMany({ where: { paketId: k.sesi.paketId }, include: { opsi: { select: { id: true } } } });
    const soalMap = new Map(soalList.map((s) => [s.id, s]));
    const disimpan: number[] = [];
    const ditolak: number[] = [];

    for (const it of items) {
      const soal = soalMap.get(Number(it.soalId));
      if (!soal) continue;
      if (!bolehUbahJawaban(k.fase)) {
        // WAKTU-02: penguncian ditegakkan di server.
        ditolak.push(soal.id);
        await catatLog({ ...aktor, kode: 'JAWABAN_DITOLAK_WAKTU', data: { nomor: soal.nomor } });
        continue;
      }
      if (!isiValid(soal.tipe, it.isi, new Set(soal.opsi.map((o) => o.id)))) continue;
      const isiStr = JSON.stringify(it.isi ?? null);
      const lama = await prisma.jawaban.findUnique({ where: { pesertaId_soalId: { pesertaId: k.peserta.id, soalId: soal.id } } });
      await prisma.jawaban.upsert({
        where: { pesertaId_soalId: { pesertaId: k.peserta.id, soalId: soal.id } },
        create: { pesertaId: k.peserta.id, soalId: soal.id, isi: isiStr, ragu: !!it.ragu },
        update: { isi: isiStr, ragu: !!it.ragu },
      });
      // Tanda ragu tidak dicatat di log (UJI-07); hanya perubahan isi jawaban.
      if (lama ? lama.isi !== isiStr : it.isi != null) {
        await catatLog({ ...aktor, kode: 'JAWABAN_DISIMPAN', data: { nomor: soal.nomor, isi: it.isi } });
      }
      disimpan.push(soal.id);
    }
    await prisma.pesertaSesi.update({ where: { id: k.peserta.id }, data: { lastSeen: k.now } });
    if (ditolak.length && !disimpan.length) {
      return NextResponse.json(
        { pesan: 'Waktu edit sudah habis. Jawaban terkunci, silakan tekan Kumpulkan.', kode: 'TERKUNCI', ditolak, serverNow: k.now.toISOString() },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, disimpan, ditolak, serverNow: k.now.toISOString() });
  } catch (e) {
    return jawabGalat(e);
  }
}
