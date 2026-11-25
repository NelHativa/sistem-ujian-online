import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { LoginShell } from '@/components/LoginShell';
import { siswaLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginSiswa() {
  if (await siswaLogin()) redirect('/ujian');
  return (
    <LoginShell
      judul="Masuk sebagai siswa"
      peranLabel="Siswa"
      tautan={[
        { href: '/guru', label: 'Login guru' },
        { href: '/admin', label: 'Login admin' },
      ]}
    >
      <LoginForm
        peran="SISWA"
        labelId="NISN"
        placeholderId="10 digit NISN"
        labelPassword="Password"
        placeholderPassword="Tanggal lahir, mis. 20100315"
        bantuan="Belum punya NISN? Masukkan NIS. Password adalah tanggal lahir dengan format TahunBulanTanggal (YYYYMMDD)."
      />
    </LoginShell>
  );
}
