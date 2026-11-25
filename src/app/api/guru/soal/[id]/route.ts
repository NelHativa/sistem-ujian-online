import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GalatApi, aksesPaket, jawabGalatApi, normalSoal } from '@/lib/guruApi';

type Ctx = { params: Promise<{ id: string }> };

async function soalDanAkses(id: number) {
  const soal = await prisma.soal.findUnique({ where: { id } });
  if (!soal) throw new GalatApi(404, 'Soal tidak ditemukan.');
  await aksesPaket(soal.paketId, true);
  return soal;
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = Number((await params).id);
    await soalDanAkses(id);
    const s = normalSoal(await req.json());
    await prisma.$transaction([
      prisma.opsi.deleteMany({ where: { soalId: id } }),
      prisma.soal.update({
        where: { id },
        data: {
          tipe: s.tipe,
          teks: s.teks,
          bobot: s.bobot,
          hitungan: s.hitungan,
          pedoman: s.pedoman,
          gambar: JSON.stringify(s.gambar),
          opsi: { create: s.opsi.map((o, urutan) => ({ ...o, urutan })) },
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalatApi(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = Number((await params).id);
    const soal = await soalDanAkses(id);
    await prisma.soal.delete({ where: { id } });
    const sisa = await prisma.soal.findMany({ where: { paketId: soal.paketId }, orderBy: { nomor: 'asc' } });
    for (const [i, s] of sisa.entries()) if (s.nomor !== i + 1) await prisma.soal.update({ where: { id: s.id }, data: { nomor: i + 1 } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalatApi(e);
  }
}
