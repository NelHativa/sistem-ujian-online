import { AlurUjian } from '@/components/ujian/AlurUjian';
import { wajibSiswa } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HalamanUjian({ params }: { params: Promise<{ sesiId: string }> }) {
  await wajibSiswa();
  const { sesiId } = await params;
  return <AlurUjian sesiId={Number(sesiId)} />;
}
