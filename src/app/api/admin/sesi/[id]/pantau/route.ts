import { NextResponse } from 'next/server';
import { aksesSesiAdmin } from '@/lib/adminApi';
import { jawabGalatApi } from '@/lib/guruApi';
import { dataPantau } from '@/lib/pantau';
import { getPengaturan } from '@/lib/settings';
import { batasEdit, batasKumpul, faseSesi } from '@/lib/waktu';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { sesi } = await aksesSesiAdmin(Number((await params).id));
    const t = await getPengaturan();
    const d = await dataPantau(sesi.id);
    return NextResponse.json({
      serverNow: new Date().toISOString(),
      sesi: {
        id: sesi.id,
        token: sesi.token,
        fase: faseSesi(sesi, t),
        paketFinal: sesi.paket.status === 'FINAL',
        mulai: sesi.mulai.toISOString(),
        selesai: sesi.selesai.toISOString(),
        batasEdit: batasEdit(sesi.selesai, t).toISOString(),
        batasKumpul: batasKumpul(sesi.selesai, t).toISOString(),
        ditutup: !!sesi.ditutupAt,
      },
      ...d,
    });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
