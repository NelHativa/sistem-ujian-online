'use client';

import { Calculator, Check, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { srcGambar } from '@/components/ujian/TampilanSoal';

export type SoalEdit = {
  id: number;
  nomor: number;
  tipe: string;
  teks: string;
  bobot: number;
  hitungan: boolean;
  pedoman: string | null;
  gambar: string[];
  opsi: { id?: number; teks: string; benar: boolean }[];
};

const TIPE = [
  { k: 'PG', l: 'Pilihan ganda', d: 'Satu jawaban benar' },
  { k: 'PGK', l: 'PG kompleks', d: 'Lebih dari satu benar' },
  { k: 'BS', l: 'Benar/Salah', d: 'Pernyataan' },
  { k: 'ESAI', l: 'Esai', d: 'Jawaban teks' },
];

const opsiAwal = (tipe: string) =>
  tipe === 'BS'
    ? [
        { teks: 'Benar', benar: false },
        { teks: 'Salah', benar: false },
      ]
    : tipe === 'ESAI'
      ? []
      : Array.from({ length: 4 }, () => ({ teks: '', benar: false }));

export function FormSoal({
  paketId,
  awal,
  nomorBaru,
  onTutup,
  onSimpan,
}: {
  paketId: number;
  awal: SoalEdit | null;
  nomorBaru: number;
  onTutup: () => void;
  onSimpan: () => void;
}) {
  const [tipe, setTipe] = useState(awal?.tipe ?? 'PG');
  const [teks, setTeks] = useState(awal?.teks ?? '');
  const [bobot, setBobot] = useState(String(awal?.bobot ?? 1));
  const [hitungan, setHitungan] = useState(awal?.hitungan ?? false);
  const [pedoman, setPedoman] = useState(awal?.pedoman ?? '');
  const [gambar, setGambar] = useState<string[]>(awal?.gambar ?? []);
  const [opsi, setOpsi] = useState(awal?.opsi.map((o) => ({ teks: o.teks, benar: o.benar })) ?? opsiAwal('PG'));
  const [unggah, setUnggah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [simpan, setSimpan] = useState(false);

  function gantiTipe(t: string) {
    setTipe(t);
    if (t === 'BS' || t === 'ESAI' || tipe === 'BS' || tipe === 'ESAI') setOpsi(opsiAwal(t));
    else if (t === 'PG') setOpsi((o) => o.map((x, i) => ({ ...x, benar: i === o.findIndex((y) => y.benar) })));
  }
  function setKunci(i: number) {
    if (tipe === 'PGK') setOpsi((o) => o.map((x, j) => (j === i ? { ...x, benar: !x.benar } : x)));
    else setOpsi((o) => o.map((x, j) => ({ ...x, benar: j === i })));
  }
  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setGalat(null);
    if (!/image\/(png|jpeg)/.test(f.type)) return setGalat('Format gambar harus JPG atau PNG.');
    if (f.size > 5 * 1024 * 1024) return setGalat('Ukuran gambar maksimal 5 MB.');
    setUnggah(true);
    try {
      const fd = new FormData();
      fd.append('berkas', f);
      const r = await fetch('/api/unggah', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) return setGalat(j.pesan);
      setGambar((g) => [...g, j.nama]);
    } catch {
      setGalat('Gagal mengunggah gambar.');
    } finally {
      setUnggah(false);
    }
  }
  async function kirim() {
    setSimpan(true);
    setGalat(null);
    try {
      const r = await fetch(awal ? `/api/guru/soal/${awal.id}` : `/api/guru/paket/${paketId}`, {
        method: awal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipe, teks, bobot: Number(bobot), hitungan, pedoman, gambar, opsi }),
      });
      const j = await r.json();
      if (!r.ok) return setGalat(j.pesan);
      onSimpan();
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal label="Form soal" lebar="max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{awal ? `Ubah soal ${awal.nomor}` : `Soal baru (nomor ${nomorBaru})`}</h3>
        <button className="btn btn-kecil" onClick={onTutup} aria-label="Tutup">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIPE.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => gantiTipe(t.k)}
            className={`rounded-xl border-2 p-2.5 text-left ${tipe === t.k ? 'border-navy bg-navy-light' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="font-heading text-sm font-bold">{t.l}</div>
            <div className="text-xs text-slate-500">{t.d}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="teks">
          {tipe === 'BS' ? 'Pernyataan' : 'Teks soal'}
        </label>
        <textarea id="teks" className="input min-h-[100px] py-2.5" value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Tulis soal di sini…" />
      </div>

      <div className="mt-3">
        <span className="label">Gambar pada badan soal (JPG/PNG, maks. 5 MB)</span>
        <div className="flex flex-wrap gap-2">
          {gambar.map((g) => (
            <div key={g} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={srcGambar(g)} alt="" className="h-24 w-32 rounded-lg border border-slate-200 bg-white object-contain" />
              <button
                type="button"
                onClick={() => setGambar((x) => x.filter((y) => y !== g))}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white"
                aria-label="Hapus gambar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-navy hover:text-navy">
            {unggah ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {unggah ? 'Mengunggah…' : 'Tambah gambar'}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={pilihGambar} disabled={unggah} />
          </label>
        </div>
      </div>

      {tipe !== 'ESAI' && (
        <div className="mt-4">
          <span className="label">
            {tipe === 'BS' ? 'Kunci jawaban' : tipe === 'PGK' ? 'Opsi jawaban — centang semua yang benar' : 'Opsi jawaban — pilih satu kunci'}
          </span>
          {tipe === 'BS' ? (
            <div className="grid grid-cols-2 gap-2">
              {opsi.map((o, i) => (
                <button
                  key={o.teks}
                  type="button"
                  onClick={() => setKunci(i)}
                  className={`btn border-2 ${o.benar ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  {o.benar && <Check className="h-4 w-4" />} {o.teks}
                </button>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {opsi.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKunci(i)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 font-heading text-sm font-bold ${tipe === 'PGK' ? 'rounded-lg' : 'rounded-full'} ${
                      o.benar ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-500'
                    }`}
                    aria-label={`Jadikan opsi ${String.fromCharCode(65 + i)} kunci`}
                    title="Tandai sebagai kunci"
                  >
                    {o.benar ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                  </button>
                  <input className="input" value={o.teks} onChange={(e) => setOpsi((x) => x.map((y, j) => (j === i ? { ...y, teks: e.target.value } : y)))} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                  <button
                    type="button"
                    className="btn-garis h-11 w-11 shrink-0 px-0"
                    onClick={() => setOpsi((x) => x.filter((_, j) => j !== i))}
                    disabled={opsi.length <= 2}
                    aria-label="Hapus opsi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {opsi.length < 5 && (
                <li>
                  <button type="button" className="btn-garis btn-kecil" onClick={() => setOpsi((x) => [...x, { teks: '', benar: false }])}>
                    <Plus className="h-4 w-4" /> Tambah opsi
                  </button>
                </li>
              )}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-slate-500">{tipe === 'BS' ? 'Opsi Benar/Salah tidak diacak.' : 'Urutan opsi diacak otomatis untuk setiap siswa.'}</p>
        </div>
      )}

      {tipe === 'ESAI' && (
        <div className="mt-4">
          <label className="label" htmlFor="pedoman">
            Pedoman jawaban (hanya terlihat oleh guru)
          </label>
          <textarea id="pedoman" className="input min-h-[70px] py-2.5" value={pedoman} onChange={(e) => setPedoman(e.target.value)} />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="label" htmlFor="bobot">
            Bobot poin
          </label>
          <input id="bobot" className="input angka" type="number" min={1} max={100} value={bobot} onChange={(e) => setBobot(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 sm:mt-6">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-navy" checked={hitungan} onChange={(e) => setHitungan(e.target.checked)} />
          <span className="text-sm">
            <span className="flex items-center gap-1 font-semibold">
              <Calculator className="h-4 w-4" /> Tandai sebagai soal hitungan
            </span>
            <span className="text-slate-500">Siswa diminta mengerjakan langkah di kertas dan menulis jawaban akhir di sistem.</span>
          </span>
        </label>
      </div>

      {galat && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
      <div className="mt-5 flex gap-2">
        <button className="btn-garis flex-1" onClick={onTutup}>
          Batal
        </button>
        <button className="btn-primer flex-1" onClick={kirim} disabled={simpan || unggah}>
          {simpan && <Loader2 className="h-4 w-4 animate-spin" />} Simpan soal
        </button>
      </div>
    </Modal>
  );
}
