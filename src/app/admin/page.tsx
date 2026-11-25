import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { LoginShell } from '@/components/LoginShell';
import { adminLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginAdmin() {
  if (await adminLogin()) redirect('/admin/beranda');
  return (
    <LoginShell
      judul="Masuk sebagai admin"
      peranLabel="Admin"
      tautan={[
        { href: '/', label: 'Login siswa' },
        { href: '/guru', label: 'Login guru' },
      ]}
    >
      <LoginForm peran="ADMIN" labelId="ID admin" placeholderId="mis. admin.xi" labelPassword="Password" placeholderPassword="Password admin" />
    </LoginShell>
  );
}
