import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LogTimeline } from '@/components/LogTimeline';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function LogGuru({ params }: { params: Promise<{ pesertaId: string }> }) {
  const { guru } = await wajibGuru();
  const id = Number((await params).pesertaId);
  const p = await prisma.pesertaSesi.findUnique({ where: { id }, include: { siswa: true, sesi: { include: { paket: true } } } });
  // Guru hanya melihat log siswa yang diajarnya (LOG-05).
  if (!p || !guru.penugasan.some((t) => t.kelasId === p.siswa.kelasId && t.mapelId === p.sesi.paket.mapelId)) notFound();
  return (
    <>
      <Link href={`/guru/koreksi/${p.sesiId}?kelas=${p.siswa.kelasId}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar peserta
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Log aktivitas siswa</h1>
      <LogTimeline pesertaId={id} />
    </>
  );
}
