'use client';

import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { PANJANG_MIN_PASSWORD, validasiPasswordBaru } from '@/lib/password';
import { Modal } from './Modal';

export function TombolGantiPassword({ peran, terang = false }: { peran: 'SISWA' | 'GURU' | 'ADMIN'; terang?: boolean }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button
        onClick={() => setBuka(true)}
        className={`btn btn-kecil ${terang ? 'text-blue-100 hover:bg-white/10' : 'border border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy'}`}
      >
        <KeyRound className="h-4 w-4" /> <span className="hidden sm:inline">Ganti password</span>
      </button>
      {buka && <FormGantiPassword peran={peran} onTutup={() => setBuka(false)} />}
    </>
  );
}

function FormGantiPassword({ peran, onTutup }: { peran: 'SISWA' | 'GURU' | 'ADMIN'; onTutup: () => void }) {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const [berhasil, setBerhasil] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    const salah = validasiPasswordBaru(baru) ?? (baru !== ulang ? 'Ulangi password baru tidak sama.' : null);
    if (salah) return setGalat(salah);
    setProses(true);
    try {
      const r = await fetch('/api/akun/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peran, passwordLama: lama, passwordBaru: baru }),
      });
      const j = await r.json();
      if (!r.ok) return setGalat(j.pesan ?? 'Gagal mengganti password.');
      setBerhasil(true);
    } catch {
      setGalat('Tidak dapat terhubung ke server. Periksa koneksi Wi-Fi.');
    } finally {
      setProses(false);
    }
  }

  if (berhasil) {
    return (
      <Modal label="Password diganti" onTutup={onTutup}>
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-2 text-lg font-bold">Password berhasil diganti</h2>
          <p className="mt-1 text-sm text-slate-600">Gunakan password baru pada login berikutnya.</p>
          <button className="btn-primer mt-4 w-full" onClick={onTutup}>
            Tutup
          </button>
        </div>
      </Modal>
    );
  }

  const tipe = lihat ? 'text' : 'password';
  return (
    <Modal label="Ganti password" onTutup={onTutup}>
      <form onSubmit={kirim} className="space-y-4" noValidate>
        <div>
          <h2 className="text-lg font-bold">Ganti password</h2>
          <p className="mt-1 text-sm text-slate-600">Password baru minimal {PANJANG_MIN_PASSWORD} karakter. Lupa password? Minta admin untuk meresetnya.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw-lama">
            Password lama
          </label>
          <input id="pw-lama" className="input font-mono" type={tipe} value={lama} onChange={(e) => setLama(e.target.value)} autoComplete="current-password" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="pw-baru">
            Password baru
          </label>
          <input id="pw-baru" className="input font-mono" type={tipe} value={baru} onChange={(e) => setBaru(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="pw-ulang">
            Ulangi password baru
          </label>
          <input id="pw-ulang" className="input font-mono" type={tipe} value={ulang} onChange={(e) => setUlang(e.target.value)} autoComplete="new-password" />
        </div>
        <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-navy" onClick={() => setLihat(!lihat)}>
          {lihat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {lihat ? 'Sembunyikan password' : 'Tampilkan password'}
        </button>
        {galat && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-garis flex-1" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className="btn-primer flex-1" disabled={proses}>
            {proses ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
