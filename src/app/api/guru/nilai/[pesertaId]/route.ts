import { NextResponse } from 'next/server';
import { guruLogin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { catatLog, konteksDari } from '@/lib/log';
import { validasiNilaiAkhir } from '@/lib/penilaian';

/** NILAI-04..07: poin esai, Nilai Akhir bilangan bulat 0–100, setiap perubahan dicatat. */
export async function PUT(req: Request, { params }: { params: Promise<{ pesertaId: string }> }) {
  const a = await guruLogin();
  if (!a) return NextResponse.json({ pesan: 'Harus login sebagai guru.' }, { status: 401 });
  const id = Number((await params).pesertaId);
  const p = await prisma.pesertaSesi.findUnique({ where: { id }, include: { siswa: true, nilai: true, sesi: { include: { paket: { include: { soal: true } } } } } });
  if (!p || !a.guru.penugasan.some((t) => t.kelasId === p.siswa.kelasId && t.mapelId === p.sesi.paket.mapelId)) {
    return NextResponse.json({ pesan: 'Tidak berhak menilai siswa ini.' }, { status: 403 });
  }
  if (!p.sesi.ditutupAt) return NextResponse.json({ pesan: 'Koreksi dibuka setelah sesi ditutup.' }, { status: 409 });
  const b = await req.json();
  const v = validasiNilaiAkhir(b.nilaiAkhir);
  if (!v.ok) return NextResponse.json({ pesan: v.pesan }, { status: 400 });

  const esai = new Map(p.sesi.paket.soal.filter((s) => s.tipe === 'ESAI').map((s) => [String(s.id), s.bobot]));
  const poinEsai: Record<string, number> = {};
  for (const [k, val] of Object.entries((b.poinEsai ?? {}) as Record<string, unknown>)) {
    const maks = esai.get(k);
    const n = Number(val);
    if (maks == null || !Number.isFinite(n)) continue;
    if (n < 0 || n > maks) return NextResponse.json({ pesan: `Poin esai harus di antara 0 dan ${maks}.` }, { status: 400 });
    poinEsai[k] = n;
  }
  const lama = p.nilai?.nilaiAkhir ?? null;
  await prisma.nilai.upsert({
    where: { pesertaId: id },
    create: { pesertaId: id, poinEsai: JSON.stringify(poinEsai), nilaiAkhir: v.nilai, catatan: b.catatan || null, diisiOleh: a.guru.nama },
    update: { poinEsai: JSON.stringify(poinEsai), nilaiAkhir: v.nilai, catatan: b.catatan || null, diisiOleh: a.guru.nama },
  });
  await catatLog({
    kode: 'NILAI_DIUBAH',
    aktorTipe: 'GURU',
    aktorId: a.guru.id,
    pesertaId: id,
    sesiId: p.sesiId,
    data: { guru: a.guru.nama, lama, baru: v.nilai, poinEsai },
    ctx: konteksDari(req),
  });
  return NextResponse.json({ ok: true });
}
