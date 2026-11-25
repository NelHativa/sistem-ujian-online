import { JudulHalaman } from '@/components/StafShell';
import { FormSesi } from '@/components/admin/FormSesi';
import { wajibAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isoTanggalWIB } from '@/lib/format';
import { getPengaturan } from '@/lib/settings';

export default async function BuatSesi() {
  const { grupIds } = await wajibAdmin();
  const kelas = await prisma.kelas.findMany({ where: { grupId: { in: grupIds } }, include: { _count: { select: { siswa: true } } }, orderBy: { nama: 'asc' } });
  const tingkat = [...new Set(kelas.map((k) => k.tingkat))];
  const paket = await prisma.paketSoal.findMany({ where: { tingkat: { in: tingkat } }, include: { mapel: true, guru: true, _count: { select: { soal: true } } }, orderBy: { id: 'asc' } });
  const t = await getPengaturan();
  return (
    <>
      <JudulHalaman judul="Buat sesi ujian" sub="Token 6 digit dibuat otomatis setelah sesi disimpan." />
      <FormSesi
        kelas={kelas.map((k) => ({ id: k.id, nama: k.nama, tingkat: k.tingkat, jumlah: k._count.siswa }))}
        paket={paket.map((p) => ({ id: p.id, judul: p.judul, tingkat: p.tingkat, status: p.status, guru: p.guru.nama, soal: p._count.soal }))}
        tanggalAwal={isoTanggalWIB(new Date())}
        batasDefault={t.batasTerlambatDefault}
      />
    </>
  );
}
