'use client';

import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Siswa = { id: number; nama: string; kelas: string; noUrut: number; dijadwalkan: boolean };

export function FormSusulan({ sesiIndukId, siswa, tanggalAwal }: { sesiIndukId: number; siswa: Siswa[]; tanggalAwal: string }) {
  const router = useRouter();
  const sekarang = new Date(Date.now() + 5 * 60_000);
  const hhmm = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [mulai, setMulai] = useState(hhmm(sekarang));
  const [selesai, setSelesai] = useState(hhmm(new Date(sekarang.getTime() + 60 * 60_000)));
  const [pilih, setPilih] = useState<number[]>(siswa.filter((s) => !s.dijadwalkan).map((s) => s.id));
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  async function simpan() {
    setProses(true);
    setGalat(null);
    const r = await fetch('/api/admin/sesi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe: 'SUSULAN', sesiIndukId, tanggal, jamMulai: mulai, jamSelesai: selesai, batasTerlambat: 10, siswaIds: pilih }),
    });
    const j = await r.json();
    setProses(false);
    if (!r.ok) return setGalat(j.pesan);
    router.push(`/admin/sesi/${j.id}`);
  }
  return (
    <div className="kartu max-w-2xl p-5">
      <span className="label">Siswa dari daftar Tidak hadir</span>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {siswa.map((s) => (
          <li key={s.id}>
            <label className="flex cursor-pointer items-center gap-3 p-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-navy"
                checked={pilih.includes(s.id)}
                onChange={(e) => setPilih((x) => (e.target.checked ? [...x, s.id] : x.filter((y) => y !== s.id)))}
              />
              <span className="font-semibold">{s.nama}</span>
              <span className="text-sm text-slate-500">
                {s.kelas} · No. {s.noUrut}
              </span>
              {s.dijadwalkan && <span className="lencana ml-auto bg-violet-100 text-violet-700">Sudah dijadwalkan susulan</span>}
            </label>
          </li>
        ))}
        {!siswa.length && <li className="p-4 text-sm text-slate-500">Tidak ada siswa berstatus Tidak hadir.</li>}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
      {galat && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
      <button className="btn-primer mt-4" onClick={simpan} disabled={proses || !pilih.length}>
        {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Buat sesi susulan ({pilih.length} siswa)
      </button>
    </div>
  );
}
