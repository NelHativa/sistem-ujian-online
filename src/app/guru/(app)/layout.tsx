import { StafShell } from '@/components/StafShell';
import { wajibGuru } from '@/lib/auth';
import { getPengaturan } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function LayoutGuru({ children }: { children: React.ReactNode }) {
  const { guru } = await wajibGuru();
  const { gantiPasswordAktif } = await getPengaturan();
  return (
    <StafShell
      peran="GURU"
      nama={guru.nama}
      keterangan={`${guru.jenisNomor} ${guru.nomorInduk}`}
      menu={[
        { href: '/guru/beranda', label: 'Beranda' },
        { href: '/guru/koreksi', label: 'Koreksi & Nilai' },
      ]}
      gantiPassword={gantiPasswordAktif}
    >
      {children}
    </StafShell>
  );
}
