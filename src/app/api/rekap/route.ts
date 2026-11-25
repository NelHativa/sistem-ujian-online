import { NextResponse } from 'next/server';
import { adminLogin, guruLogin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buatExcelRekap } from '@/lib/excel';

/** REKAP-03: guru mengekspor kelas yang diajarnya, admin mengekspor kelas di grupnya. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sesiId = Number(url.searchParams.get('sesiId'));
  const kelasId = Number(url.searchParams.get('kelasId'));
  const sesi = await prisma.sesiUjian.findUnique({ where: { id: sesiId }, include: { paket: true } });
  const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } });
  if (!sesi || !kelas) return NextResponse.json({ pesan: 'Data tidak ditemukan.' }, { status: 404 });

  let pengekspor: string | null = null;
  const g = await guruLogin();
  if (g && g.guru.penugasan.some((p) => p.kelasId === kelasId && p.mapelId === sesi.paket.mapelId)) pengekspor = g.guru.nama;
  if (!pengekspor) {
    const a = await adminLogin();
    if (a && a.grupIds.includes(kelas.grupId)) pengekspor = a.admin.nama;
  }
  if (!pengekspor) return NextResponse.json({ pesan: 'Tidak berhak mengekspor kelas ini.' }, { status: 403 });

  const { nama, buffer } = await buatExcelRekap(sesiId, kelasId, pengekspor);
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nama}"`,
      'Cache-Control': 'no-store',
    },
  });
}
