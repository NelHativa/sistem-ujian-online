import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/StafShell';
import { FormSusulan } from '@/components/admin/FormSusulan';
import { aksesSesiAdmin } from '@/lib/adminApi';
import { prisma } from '@/lib/db';
import { isoTanggalWIB, tanggalJam } from '@/lib/format';
import { GalatApi } from '@/lib/guruApi';

export default async function Susulan({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  let r;
  try {
    r = await aksesSesiAdmin(id);
  } catch (e) {
    if (e instanceof GalatApi) notFound();
    throw e;
  }
  const s = r.sesi;
  const tidakHadir = await prisma.pesertaSesi.findMany({
    where: { sesiId: id, kehadiran: 'TIDAK_HADIR' },
    include: { siswa: { include: { kelas: true } } },
    orderBy: [{ siswa: { kelasId: 'asc' } }, { siswa: { noUrut: 'asc' } }],
  });
  // Siswa yang sudah ikut sesi susulan lain untuk sesi ini
  const sudahSusulan = await prisma.pesertaSesi.findMany({ where: { sesi: { sesiIndukId: id } }, select: { siswaId: true } });
  const dijadwalkan = new Set(sudahSusulan.map((x) => x.siswaId));
  return (
    <>
      <Link href={`/admin/sesi/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>
      <JudulHalaman
        judul="Buat sesi susulan"
        sub={`${s.paket.mapel.nama} (${s.paket.jenisUjian}) · sesi reguler ${tanggalJam(s.mulai)} · memakai paket soal yang sama dengan token baru`}
      />
      <FormSusulan
        sesiIndukId={id}
        tanggalAwal={isoTanggalWIB(new Date())}
        siswa={tidakHadir.map((p) => ({ id: p.siswaId, nama: p.siswa.nama, kelas: p.siswa.kelas.nama, noUrut: p.siswa.noUrut, dijadwalkan: dijadwalkan.has(p.siswaId) }))}
      />
    </>
  );
}
