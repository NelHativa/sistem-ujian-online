import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jawabGalat, konteksUjian, waktuSesi } from '@/lib/ujianSiswa';

/** Heartbeat: sinkron jam server (WAKTU-01), status online untuk dashboard, deteksi paksa kumpul. */
export async function POST(_req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const k = await konteksUjian(Number(sesiId));
    if (k.peserta.jamMasuk && !k.peserta.jamKumpul) {
      await prisma.pesertaSesi.update({ where: { id: k.peserta.id }, data: { lastSeen: k.now } });
    }
    return NextResponse.json({
      serverNow: k.now.toISOString(),
      fase: k.fase,
      langkah: k.langkah,
      pelanggaran: k.peserta.pelanggaran,
      jamKumpul: k.peserta.jamKumpul?.toISOString() ?? null,
      waktu: waktuSesi(k.sesi, k.t),
    });
  } catch (e) {
    return jawabGalat(e);
  }
}
