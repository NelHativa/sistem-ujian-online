import { NextResponse } from 'next/server';
import { periksaCaptcha } from '@/lib/captcha';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { GalatUjian, jawabGalat, konteksUjian } from '@/lib/ujianSiswa';

export async function POST(req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const ctx = konteksDari(req);
    const k = await konteksUjian(Number(sesiId));
    if (k.langkah !== 'TOKEN') {
      if (k.langkah === 'KONFIRMASI' || k.langkah === 'KERJAKAN') return NextResponse.json({ ok: true });
      throw new GalatUjian(409, 'Ujian tidak dapat dimasuki saat ini.');
    }
    const body = await req.json().catch(() => ({}));
    if (!(await periksaCaptcha(body.captchaId, body.captcha))) {
      return NextResponse.json({ pesan: 'Captcha salah. Silakan coba lagi.' }, { status: 400 });
    }
    const token = String(body.token ?? '').trim();
    // Baca token terbaru dari DB: token lama langsung tidak berlaku setelah diubah admin (SESI-05).
    const sesi = await prisma.sesiUjian.findUniqueOrThrow({ where: { id: k.sesi.id } });
    const aktor = { aktorTipe: 'SISWA' as const, aktorId: k.login.siswa.id, pesertaId: k.peserta.id, sesiId: k.sesi.id, ctx };
    if (token !== sesi.token) {
      await catatLog({ ...aktor, kode: 'TOKEN_SALAH', data: { token } });
      return NextResponse.json({ pesan: 'Token salah. Tanyakan token kepada pengawas ruang ujian.' }, { status: 400 });
    }
    await prisma.pesertaSesi.update({ where: { id: k.peserta.id }, data: { tokenLoginId: k.login.sesiLogin.id } });
    await catatLog({ ...aktor, kode: 'TOKEN_BENAR' });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalat(e);
  }
}
