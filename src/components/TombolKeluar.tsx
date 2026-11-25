'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TombolKeluar({ peran, terang = false }: { peran: 'SISWA' | 'GURU' | 'ADMIN'; terang?: boolean }) {
  const router = useRouter();
  async function keluar() {
    if (!confirm('Keluar dari akun ini?')) return;
    const r = await fetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ peran }) });
    const j = await r.json();
    router.replace(j.tujuan ?? '/');
    router.refresh();
  }
  return (
    <button
      onClick={keluar}
      className={`btn btn-kecil ${terang ? 'text-blue-100 hover:bg-white/10' : 'border border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy'}`}
    >
      <LogOut className="h-4 w-4" /> Keluar
    </button>
  );
}
