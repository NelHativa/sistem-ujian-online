import { prisma } from './db';
import { hitungNilai, parseIsi } from './penilaian';

/**
 * REKAP-01: kumpulkan nilai per kelas per mapel (sesi reguler + susulan dengan paket mapel/jenis/tingkat yang sama).
 * Siswa yang ikut susulan memakai baris susulan (SUS-04).
 */
export async function rekapKelas(sesiId: number, kelasId: number) {
  const sesi = await prisma.sesiUjian.findUniqueOrThrow({ where: { id: sesiId }, include: { paket: { include: { mapel: true, guru: true } } } });
  const indukId = sesi.sesiIndukId ?? sesi.id;
  const semuaSesi = await prisma.sesiUjian.findMany({
    where: { OR: [{ id: indukId }, { sesiIndukId: indukId }] },
    include: { paket: { include: { soal: { include: { opsi: true }, orderBy: { nomor: 'asc' } } } } },
    orderBy: { mulai: 'asc' },
  });
  const kelas = await prisma.kelas.findUniqueOrThrow({ where: { id: kelasId } });
  const siswa = await prisma.siswa.findMany({ where: { kelasId }, orderBy: { noUrut: 'asc' } });
  const peserta = await prisma.pesertaSesi.findMany({
    where: { sesiId: { in: semuaSesi.map((s) => s.id) }, siswa: { kelasId } },
    include: { jawaban: true, nilai: true },
  });
  const penugasan = await prisma.penugasan.findFirst({ where: { kelasId, mapelId: sesi.paket.mapelId }, include: { guru: true } });

  const baris = siswa
    .map((s) => {
      const milik = peserta.filter((p) => p.siswaId === s.id);
      if (!milik.length) return null;
      const susulan = milik.find((p) => semuaSesi.find((x) => x.id === p.sesiId)?.tipe === 'SUSULAN');
      const p = susulan ?? milik[0];
      const ss = semuaSesi.find((x) => x.id === p.sesiId)!;
      const jawaban = new Map(p.jawaban.map((j) => [j.soalId, parseIsi(j.isi)]));
      const poinEsai = JSON.parse(p.nilai?.poinEsai ?? '{}') as Record<string, number>;
      const h = hitungNilai(ss.paket.soal, jawaban, poinEsai);
      return {
        pesertaId: p.id,
        sesiId: p.sesiId,
        siswa: s,
        tipeSesi: ss.tipe,
        kehadiran: p.kehadiran,
        jamMasuk: p.jamMasuk,
        jamKumpul: p.jamKumpul,
        caraKumpul: p.caraKumpul,
        dijawab: h.dijawab,
        totalSoal: ss.paket.soal.length,
        skorObjektif: h.skorObjektif,
        totalObjektif: h.totalObjektif,
        nilaiSaran: p.jamMasuk ? h.nilaiSaran : null,
        nilaiAkhir: p.nilai?.nilaiAkhir ?? null,
        sudahDikoreksi: p.nilai?.nilaiAkhir != null,
        pelanggaran: p.pelanggaran,
        durasiKeluarDetik: p.durasiKeluarDetik,
        sirine: p.sirine,
        catatan: p.nilai?.catatan ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { sesi, semuaSesi, kelas, baris, guruPengampu: penugasan?.guru.nama ?? sesi.paket.guru.nama };
}
