import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { jawabGalat, konteksUjian } from '@/lib/ujianSiswa';

const DIIZINKAN = new Set([
  'KELUAR_TAB',
  'KEMBALI_TAB',
  'SIRINE_DIBUNYIKAN',
  'PRINTSCREEN_TERDETEKSI',
  'KELUAR_LAYAR_PENUH',
  'WAKE_LOCK_TIDAK_TERSEDIA',
  'KONEKSI_PUTUS',
  'KONEKSI_TERSAMBUNG',
]);

/** Peristiwa anti-kecurangan & koneksi dari perangkat siswa (AMAN-03..10, LOG-02). */
export async function POST(req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const ctx = konteksDari(req);
    const k = await konteksUjian(Number(sesiId));
    const body = await req.json().catch(() => ({}));
    const kode = String(body.kode ?? '');
    const data = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>;
    if (!DIIZINKAN.has(kode)) return NextResponse.json({ pesan: 'Peristiwa tidak dikenal' }, { status: 400 });
    if (!k.peserta.jamMasuk || k.peserta.jamKumpul) return NextResponse.json({ ok: true, pelanggaran: k.peserta.pelanggaran });

    const aktor = { aktorTipe: 'SISWA' as const, aktorId: k.login.siswa.id, pesertaId: k.peserta.id, sesiId: k.sesi.id, ctx };
    let p: { id: number; pelanggaran: number; sedangKeluarSejak: Date | null } = k.peserta;

    if (kode === 'KELUAR_TAB') {
      if (!p.sedangKeluarSejak) {
        p = await prisma.pesertaSesi.update({
          where: { id: p.id },
          data: { pelanggaran: { increment: 1 }, sedangKeluarSejak: k.now, lastSeen: k.now },
        });
        await catatLog({ ...aktor, kode, data: { urutan: p.pelanggaran, jenis: data.jenis } });
      }
    } else if (kode === 'KEMBALI_TAB') {
      if (p.sedangKeluarSejak) {
        const dariServer = (k.now.getTime() - p.sedangKeluarSejak.getTime()) / 1000;
        const dariKlien = Number(data.durasiDetik);
        // Bila sempat offline, durasi dari perangkat lebih akurat; tetap dibatasi oleh hitungan server.
        const dur = Math.round(Number.isFinite(dariKlien) && dariKlien > 0 ? Math.min(dariKlien, dariServer) : dariServer);
        p = await prisma.pesertaSesi.update({
          where: { id: p.id },
          data: { durasiKeluarDetik: { increment: dur }, sedangKeluarSejak: null, lastSeen: k.now },
        });
        await catatLog({ ...aktor, kode, data: { urutan: p.pelanggaran, durasiDetik: dur } });
      }
    } else if (kode === 'SIRINE_DIBUNYIKAN') {
      p = await prisma.pesertaSesi.update({ where: { id: p.id }, data: { sirine: true } });
      await catatLog({ ...aktor, kode, data: { urutan: p.pelanggaran } });
    } else {
      await catatLog({ ...aktor, kode, data });
    }
    return NextResponse.json({ ok: true, pelanggaran: p.pelanggaran, serverNow: k.now.toISOString() });
  } catch (e) {
    return jawabGalat(e);
  }
}
