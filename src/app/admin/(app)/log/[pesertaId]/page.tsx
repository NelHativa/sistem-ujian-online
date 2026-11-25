import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LogTimeline } from '@/components/LogTimeline';
import { wajibAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function LogAdmin({ params }: { params: Promise<{ pesertaId: string }> }) {
  const { grupIds } = await wajibAdmin();
  const id = Number((await params).pesertaId);
  const p = await prisma.pesertaSesi.findUnique({ where: { id }, include: { siswa: { include: { kelas: true } } } });
  if (!p || !grupIds.includes(p.siswa.kelas.grupId)) notFound();
  return (
    <>
      <Link href={`/admin/sesi/${p.sesiId}`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali ke pemantauan
      </Link>
      <h1 className="mb-4 text-2xl font-bold">Log aktivitas siswa</h1>
      <LogTimeline pesertaId={id} />
    </>
  );
}
