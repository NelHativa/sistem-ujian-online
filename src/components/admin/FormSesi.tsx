'use client';

import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Kelas = { id: number; nama: string; tingkat: string; jumlah: number };
type Paket = { id: number; judul: string; tingkat: string; status: string; guru: string; soal: number };

export function FormSesi({ kelas, paket, tanggalAwal, batasDefault }: { kelas: Kelas[]; paket: Paket[]; tanggalAwal: string; batasDefault: number }) {
  const router = useRouter();
  const [paketId, setPaketId] = useState(paket[0]?.id ?? 0);
  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [mulai, setMulai] = useState('07:30');
  const [selesai, setSelesai] = useState('09:00');
  const [batas, setBatas] = useState(String(batasDefault));
  const [pilih, setPilih] = useState<number[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const p = paket.find((x) => x.id === paketId);
  const kelasCocok = kelas.filter((k) => k.tingkat === p?.tingkat);

  async function simpan() {
    setProses(true);
    setGalat(null);
    const r = await fetch('/api/admin/sesi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe: 'REGULER', paketId, tanggal, jamMulai: mulai, jamSelesai: selesai, batasTerlambat: Number(batas), kelasIds: pilih }),
    });
    const j = await r.json();
    setProses(false);
    if (!r.ok) return setGalat(j.pesan);
    router.push(`/admin/sesi/${j.id}`);
  }

  return (
    <div className="kartu max-w-2xl p-5">
      <div className="space-y-4">
        <div>
          <label className="label">Paket soal</label>
          <select
            className="input"
            value={paketId}
            onChange={(e) => {
              setPaketId(Number(e.target.value));
              setPilih([]);
            }}
          >
            {paket.map((x) => (
              <option key={x.id} value={x.id}>
                {x.judul} — {x.status === 'FINAL' ? 'Final' : 'Draf'} · {x.soal} soal · {x.guru}
              </option>
            ))}
          </select>
          {p?.status !== 'FINAL' && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Paket masih Draf. Sesi tetap dapat dibuat, tetapi ditandai merah dan tidak dapat dimulai sampai guru memfinalkan.
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <label className="label">Jam mulai (WIB)</label>
            <input type="time" className="input" value={mulai} onChange={(e) => setMulai(e.target.value)} />
          </div>
          <div>
            <label className="label">Jam selesai (WIB)</label>
            <input type="time" className="input" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
          </div>
        </div>
        <div className="max-w-xs">
          <label className="label">Batas keterlambatan (menit setelah mulai)</label>
          <input type="number" min={0} max={120} className="input" value={batas} onChange={(e) => setBatas(e.target.value)} />
        </div>
        <div>
          <span className="label">Kelas peserta (tingkat {p?.tingkat})</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {kelasCocok.map((k) => (
              <label key={k.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${pilih.includes(k.id) ? 'border-navy bg-navy-light' : 'border-slate-200'}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={pilih.includes(k.id)}
                  onChange={(e) => setPilih((x) => (e.target.checked ? [...x, k.id] : x.filter((y) => y !== k.id)))}
                />
                <span className="font-semibold">{k.nama}</span>
                <span className="ml-auto text-xs text-slate-500">{k.jumlah} siswa</span>
              </label>
            ))}
            {!kelasCocok.length && <p className="text-sm text-slate-500">Tidak ada kelas tingkat ini di grup Anda.</p>}
          </div>
        </div>
        {galat && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
        <button className="btn-primer" onClick={simpan} disabled={proses || !pilih.length}>
          {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan sesi
        </button>
      </div>
    </div>
  );
}
