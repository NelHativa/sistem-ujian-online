'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FormPengaturan({ edit, kumpul }: { edit: number; kumpul: number }) {
  const router = useRouter();
  const [e, setE] = useState(String(edit));
  const [k, setK] = useState(String(kumpul));
  const [pesan, setPesan] = useState<string | null>(null);
  async function simpan() {
    const r = await fetch('/api/admin/pengaturan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toleransiEditMenit: Number(e), toleransiKumpulMenit: Number(k) }),
    });
    const j = await r.json();
    setPesan(r.ok ? 'Pengaturan disimpan dan langsung berlaku.' : j.pesan);
    router.refresh();
  }
  return (
    <div className="kartu max-w-xl p-5">
      <h2 className="font-bold">Toleransi waktu setelah jam selesai</h2>
      <p className="mt-1 text-sm text-slate-600">Nilai produksi: edit 1 menit, kumpul 15 menit. Untuk demo, toleransi kumpul boleh dipendekkan (mis. 3 menit) dan disampaikan terbuka kepada audiens.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Toleransi edit (menit)</label>
          <input type="number" className="input" min={0} value={e} onChange={(x) => setE(x.target.value)} />
        </div>
        <div>
          <label className="label">Toleransi kumpul (menit)</label>
          <input type="number" className="input" min={1} value={k} onChange={(x) => setK(x.target.value)} />
        </div>
      </div>
      {pesan && <p className="mt-3 rounded-lg bg-navy-light p-2.5 text-sm text-navy">{pesan}</p>}
      <button className="btn-primer mt-4" onClick={simpan}>
        <Save className="h-4 w-4" /> Simpan
      </button>
    </div>
  );
}
