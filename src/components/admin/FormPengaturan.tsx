'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function kirimPengaturan(data: Record<string, unknown>) {
  const r = await fetch('/api/admin/pengaturan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const j = await r.json();
  return r.ok ? 'Pengaturan disimpan dan langsung berlaku.' : (j.pesan as string);
}

export function FormPengaturan({ edit, kumpul, gantiPasswordAktif }: { edit: number; kumpul: number; gantiPasswordAktif: boolean }) {
  const router = useRouter();
  const [e, setE] = useState(String(edit));
  const [k, setK] = useState(String(kumpul));
  const [pesan, setPesan] = useState<string | null>(null);
  const [pw, setPw] = useState(gantiPasswordAktif);
  const [pesanPw, setPesanPw] = useState<string | null>(null);

  async function simpan() {
    setPesan(await kirimPengaturan({ toleransiEditMenit: Number(e), toleransiKumpulMenit: Number(k) }));
    router.refresh();
  }
  async function simpanPw() {
    setPesanPw(await kirimPengaturan({ gantiPasswordAktif: pw }));
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="kartu p-5">
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

      <div className="kartu p-5">
        <h2 className="font-bold">Ganti password</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bila aktif, siswa, guru, dan admin dapat mengganti password sendiri (minimal 8 karakter), dan admin dapat mereset password siswa atau guru ke tanggal lahir di menu Data master.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-navy" checked={pw} onChange={(x) => setPw(x.target.checked)} />
          <span className="text-sm font-medium">Aktifkan fitur ganti password</span>
        </label>
        {pesanPw && <p className="mt-3 rounded-lg bg-navy-light p-2.5 text-sm text-navy">{pesanPw}</p>}
        <button className="btn-primer mt-4" onClick={simpanPw}>
          <Save className="h-4 w-4" /> Simpan
        </button>
      </div>
    </div>
  );
}
