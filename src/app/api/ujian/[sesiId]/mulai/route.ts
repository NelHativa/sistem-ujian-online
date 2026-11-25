import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { ringkasPerangkat } from '@/lib/perangkat';
import { GalatUjian, jawabGalat, konteksUjian } from '@/lib/ujianSiswa';
import { statusKehadiran } from '@/lib/waktu';

export async function POST(req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const ctx = konteksDari(req);
    const k = await konteksUjian(Number(sesiId));
    if (k.langkah === 'KERJAKAN') return NextResponse.json({ ok: true });
    if (k.langkah !== 'KONFIRMASI') throw new GalatUjian(409, 'Ujian tidak dapat dimulai saat ini.');
    const kehadiran = statusKehadiran(k.sesi.mulai, k.sesi.batasTerlambatMenit, k.now);
    await prisma.pesertaSesi.update({
      where: { id: k.peserta.id },
      data: { jamMasuk: k.now, kehadiran, perangkat: ringkasPerangkat(ctx.ua), lastSeen: k.now },
    });
    await catatLog({
      kode: 'MASUK_UJIAN',
      aktorTipe: 'SISWA',
      aktorId: k.login.siswa.id,
      pesertaId: k.peserta.id,
      sesiId: k.sesi.id,
      data: { kehadiran },
      ctx,
    });
    return NextResponse.json({ ok: true, kehadiran });
  } catch (e) {
    return jawabGalat(e);
  }
}
