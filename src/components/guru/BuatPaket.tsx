'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/Modal';

export function BuatPaket({ opsi }: { opsi: { mapelId: number; mapel: string; tingkat: string }[] }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [pilih, setPilih] = useState(0);
  const [jenis, setJenis] = useState('PAS');
  const [galat, setGalat] = useState<string | null>(null);
  async function buat() {
    const o = opsi[pilih];
    const r = await fetch('/api/guru/paket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapelId: o.mapelId, tingkat: o.tingkat, jenisUjian: jenis }),
    });
    const j = await r.json();
    if (!r.ok) return setGalat(j.pesan);
    router.push(`/guru/paket/${j.id}`);
  }
  return (
    <>
      <button className="btn-primer btn-kecil" onClick={() => setBuka(true)}>
        <Plus className="h-4 w-4" /> Paket baru
      </button>
      {buka && (
        <Modal label="Paket baru" onTutup={() => setBuka(false)}>
          <h3 className="text-lg font-bold">Buat paket soal</h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Mata pelajaran & tingkat</label>
              <select className="input" value={pilih} onChange={(e) => setPilih(Number(e.target.value))}>
                {opsi.map((o, i) => (
                  <option key={i} value={i}>
                    {o.mapel} — Kelas {o.tingkat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jenis ujian</label>
              <select className="input" value={jenis} onChange={(e) => setJenis(e.target.value)}>
                <option value="PTS">PTS</option>
                <option value="PAS">PAS</option>
                <option value="PAT">PAT</option>
                <option value="US">Ujian Sekolah</option>
              </select>
            </div>
            {galat && <p className="text-sm text-rose-700">{galat}</p>}
          </div>
          <div className="mt-5 flex gap-2">
            <button className="btn-garis flex-1" onClick={() => setBuka(false)}>
              Batal
            </button>
            <button className="btn-primer flex-1" onClick={buat}>
              Buat paket
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
