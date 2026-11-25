'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function TombolResetPassword({ tipe, id, nama }: { tipe: 'SISWA' | 'GURU'; id: number; nama: string }) {
  const [status, setStatus] = useState<'diam' | 'proses' | 'selesai'>('diam');

  async function reset() {
    if (!confirm(`Reset password ${nama} ke tanggal lahir (YYYYMMDD)?`)) return;
    setStatus('proses');
    const r = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe, id }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.pesan ?? 'Gagal mereset password.');
      return setStatus('diam');
    }
    setStatus('selesai');
  }

  if (status === 'selesai') return <span className="lencana bg-emerald-100 text-emerald-700">Direset</span>;
  return (
    <button className="btn btn-kecil border border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy" onClick={reset} disabled={status === 'proses'}>
      <RotateCcw className="h-3.5 w-3.5" /> Reset password
    </button>
  );
}
