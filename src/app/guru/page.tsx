import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { LoginShell } from '@/components/LoginShell';
import { guruLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginGuru() {
  if (await guruLogin()) redirect('/guru/beranda');
  return (
    <LoginShell
      judul="Masuk sebagai guru"
      peranLabel="Guru"
      tautan={[
        { href: '/', label: 'Login siswa' },
        { href: '/admin', label: 'Login admin' },
      ]}
    >
      <LoginForm
        peran="GURU"
        labelId="NUPTK / NRG / NPK"
        placeholderId="Nomor induk guru"
        labelPassword="Password"
        placeholderPassword="Tanggal lahir, mis. 19850412"
        bantuan="Gunakan salah satu nomor yang terdaftar di sekolah. Password adalah tanggal lahir (YYYYMMDD)."
      />
    </LoginShell>
  );
}
