import { StafShell } from '@/components/StafShell';
import { wajibAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { admin, grupIds } = await wajibAdmin();
  const grup = await prisma.grupKelas.findMany({ where: { id: { in: grupIds } } });
  const menu = [
    { href: '/admin/beranda', label: 'Jadwal & Pemantauan' },
    { href: '/admin/sesi/baru', label: 'Buat sesi' },
    { href: '/admin/data', label: 'Data master' },
  ];
  if (admin.peran === 'UTAMA') menu.push({ href: '/admin/pengaturan', label: 'Pengaturan' });
  return (
    <StafShell peran="ADMIN" nama={admin.nama} keterangan={admin.peran === 'UTAMA' ? 'Admin Utama · semua grup' : `Admin Grup · ${grup.map((g) => g.nama).join(', ')}`} menu={menu}>
      {children}
    </StafShell>
  );
}
