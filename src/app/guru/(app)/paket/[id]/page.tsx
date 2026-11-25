import { notFound } from 'next/navigation';
import { EditorPaket } from '@/components/guru/EditorPaket';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { paketMilikGuru, paketTerkunci, validasiPaket } from '@/lib/paket';

export default async function HalamanPaket({ params }: { params: Promise<{ id: string }> }) {
  const { guru } = await wajibGuru();
  const id = Number((await params).id);
  if (!(await paketMilikGuru(id, guru.id))) notFound();
  const paket = await prisma.paketSoal.findUniqueOrThrow({
    where: { id },
    include: { mapel: true, soal: { include: { opsi: { orderBy: { urutan: 'asc' } } }, orderBy: { nomor: 'asc' } }, sesi: true },
  });
  const v = validasiPaket(paket.soal);
  return (
    <EditorPaket
      paket={{
        id: paket.id,
        judul: paket.judul,
        mapel: paket.mapel.nama,
        tingkat: paket.tingkat,
        jenisUjian: paket.jenisUjian,
        status: paket.status,
        terkunci: await paketTerkunci(id),
        jumlahSesi: paket.sesi.length,
      }}
      soal={paket.soal.map((s) => ({
        id: s.id,
        nomor: s.nomor,
        tipe: s.tipe,
        teks: s.teks,
        bobot: s.bobot,
        hitungan: s.hitungan,
        pedoman: s.pedoman,
        gambar: JSON.parse(s.gambar) as string[],
        opsi: s.opsi.map((o) => ({ id: o.id, teks: o.teks, benar: o.benar })),
      }))}
      validasi={v}
    />
  );
}
