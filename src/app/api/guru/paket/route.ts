import { NextResponse } from 'next/server';
import { guruLogin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LABEL_JENIS_UJIAN } from '@/lib/format';

export async function POST(req: Request) {
  const a = await guruLogin();
  if (!a) return NextResponse.json({ pesan: 'Harus login sebagai guru.' }, { status: 401 });
  const b = await req.json();
  const mapelId = Number(b.mapelId);
  const tingkat = String(b.tingkat);
  const jenis = String(b.jenisUjian);
  if (!LABEL_JENIS_UJIAN[jenis]) return NextResponse.json({ pesan: 'Jenis ujian tidak valid.' }, { status: 400 });
  const boleh = a.guru.penugasan.some((p) => p.mapelId === mapelId && p.kelas.tingkat === tingkat);
  if (!boleh) return NextResponse.json({ pesan: 'Anda tidak ditugaskan untuk mapel dan tingkat ini.' }, { status: 403 });
  const mapel = await prisma.mapel.findUniqueOrThrow({ where: { id: mapelId } });
  const p = await prisma.paketSoal.create({
    data: { judul: `${LABEL_JENIS_UJIAN[jenis]} ${mapel.nama} Kelas ${tingkat}`, mapelId, tingkat, jenisUjian: jenis, guruId: a.guru.id },
  });
  return NextResponse.json({ id: p.id });
}
