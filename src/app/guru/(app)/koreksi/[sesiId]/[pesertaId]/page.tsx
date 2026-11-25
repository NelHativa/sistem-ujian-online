import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormKoreksi } from '@/components/guru/FormKoreksi';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cekBenar, parseIsi } from '@/lib/penilaian';
import { rekapKelas } from '@/lib/rekap';

export default async function Koreksi({
  params,
  searchParams,
}: {
  params: Promise<{ sesiId: string; pesertaId: string }>;
  searchParams: Promise<{ kelas?: string; dari?: string }>;
}) {
  const { guru } = await wajibGuru();
  const { pesertaId } = await params;
  const sp = await searchParams;
  const p = await prisma.pesertaSesi.findUnique({
    where: { id: Number(pesertaId) },
    include: {
      siswa: { include: { kelas: true } },
      jawaban: true,
      nilai: true,
      sesi: { include: { paket: { include: { mapel: true, soal: { include: { opsi: { orderBy: { urutan: 'asc' } } }, orderBy: { nomor: 'asc' } } } } } },
    },
  });
  if (!p || !p.sesi.ditutupAt || !guru.penugasan.some((t) => t.kelasId === p.siswa.kelasId && t.mapelId === p.sesi.paket.mapelId)) notFound();
  const dari = Number(sp.dari ?? p.sesiId);
  const rekap = await rekapKelas(dari, p.siswa.kelasId);
  const urut = rekap.baris.filter((b) => b.jamMasuk);
  const i = urut.findIndex((b) => b.pesertaId === p.id);
  const href = (b?: (typeof urut)[number]) => (b ? `/guru/koreksi/${b.sesiId}/${b.pesertaId}?kelas=${p.siswa.kelasId}&dari=${dari}` : null);
  const jawab = new Map(p.jawaban.map((j) => [j.soalId, parseIsi(j.isi)]));

  return (
    <>
      <Link href={`/guru/koreksi/${dari}?kelas=${p.siswa.kelasId}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Daftar peserta {p.siswa.kelas.nama}
      </Link>
      <FormKoreksi
        pesertaId={p.id}
        siswa={{ nama: p.siswa.nama, noUrut: p.siswa.noUrut, kelas: p.siswa.kelas.nama, nis: p.siswa.nis }}
        mapel={`${p.sesi.paket.mapel.nama} (${p.sesi.paket.jenisUjian}${p.sesi.tipe === 'SUSULAN' ? ', susulan' : ''})`}
        pelanggaran={p.pelanggaran}
        soal={p.sesi.paket.soal.map((s) => {
          const isi = jawab.get(s.id) ?? null;
          return {
            id: s.id,
            nomor: s.nomor,
            tipe: s.tipe,
            teks: s.teks,
            bobot: s.bobot,
            gambar: JSON.parse(s.gambar) as string[],
            hitungan: s.hitungan,
            pedoman: s.pedoman,
            opsi: s.opsi.map((o) => ({ id: o.id, teks: o.teks, benar: o.benar })),
            isi: isi as number | number[] | string | null,
            benar: cekBenar(s, isi),
          };
        })}
        poinEsaiAwal={JSON.parse(p.nilai?.poinEsai ?? '{}')}
        nilaiAkhirAwal={p.nilai?.nilaiAkhir ?? null}
        catatanAwal={p.nilai?.catatan ?? ''}
        sebelumnya={href(urut[i - 1])}
        berikutnya={href(urut[i + 1])}
        posisi={`${i + 1} dari ${urut.length}`}
      />
    </>
  );
}
