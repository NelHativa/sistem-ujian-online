import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { GalatUjian, jawabGalat, konteksUjian } from '@/lib/ujianSiswa';
import { bolehKumpul } from '@/lib/waktu';

export async function POST(req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const k = await konteksUjian(Number(sesiId));
    if (k.peserta.jamKumpul) return NextResponse.json({ ok: true, jamKumpul: k.peserta.jamKumpul.toISOString() });
    if (k.langkah !== 'KERJAKAN' || !bolehKumpul(k.fase)) throw new GalatUjian(409, 'Ujian tidak dapat dikumpulkan saat ini.');
    await prisma.pesertaSesi.update({
      where: { id: k.peserta.id },
      data: { jamKumpul: k.now, caraKumpul: 'MANUAL', sedangKeluarSejak: null },
    });
    await catatLog({
      kode: 'KUMPUL_MANUAL',
      aktorTipe: 'SISWA',
      aktorId: k.login.siswa.id,
      pesertaId: k.peserta.id,
      sesiId: k.sesi.id,
      ctx: konteksDari(req),
    });
    return NextResponse.json({ ok: true, jamKumpul: k.now.toISOString() });
  } catch (e) {
    return jawabGalat(e);
  }
}
