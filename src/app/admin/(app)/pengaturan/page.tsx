import { redirect } from 'next/navigation';
import { JudulHalaman } from '@/components/StafShell';
import { FormPengaturan } from '@/components/admin/FormPengaturan';
import { wajibAdmin } from '@/lib/auth';
import { getPengaturan } from '@/lib/settings';

export default async function Pengaturan() {
  const { admin } = await wajibAdmin();
  if (admin.peran !== 'UTAMA') redirect('/admin/beranda');
  const t = await getPengaturan();
  return (
    <>
      <JudulHalaman judul="Pengaturan global" sub={`${t.namaSekolah} · Tahun ajaran ${t.tahunAjaran} · Semester ${t.semester}`} />
      <FormPengaturan edit={t.toleransiEditMenit} kumpul={t.toleransiKumpulMenit} />
    </>
  );
}
