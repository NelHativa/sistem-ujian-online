'use client';

import { Calculator, Check, Maximize2, Minus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HURUF, INSTRUKSI_HITUNGAN, IsiJawaban, SoalSiswa } from './tipe';

const LABEL_TIPE: Record<string, string> = {
  PG: 'Pilihan ganda',
  PGK: 'Pilihan ganda kompleks',
  BS: 'Benar / Salah',
  ESAI: 'Esai',
};

export function srcGambar(nama: string) {
  return nama.startsWith('blob:') || nama.startsWith('data:') ? nama : `/api/gambar/${encodeURIComponent(nama)}`;
}

type Props = {
  soal: SoalSiswa;
  isi: IsiJawaban;
  onUbah: (isi: IsiJawaban, segera: boolean) => void;
  terkunci?: boolean;
  blokirTempel?: boolean;
};

export function TampilanSoal({ soal, isi, onUbah, terkunci = false, blokirTempel = true }: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-heading text-lg font-bold text-navy">Soal {soal.nomor}</span>
        <span className="lencana bg-slate-100 text-slate-600">{LABEL_TIPE[soal.tipe] ?? soal.tipe}</span>
      </div>

      {soal.hitungan && (
        <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <Calculator className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Soal hitungan.</strong> {INSTRUKSI_HITUNGAN}
          </p>
        </div>
      )}

      <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-slate-900">{soal.teks}</p>

      {soal.gambar.length > 0 && (
        <div className="mt-4 grid gap-3">
          {soal.gambar.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setZoom(g)}
              className="group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
              aria-label="Perbesar gambar"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={srcGambar(g)} alt="Gambar soal" className="mx-auto max-h-[340px] w-auto max-w-full object-contain" draggable={false} />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-900/75 px-2 py-1 text-xs font-medium text-white">
                <Maximize2 className="h-3.5 w-3.5" /> Perbesar
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {soal.tipe === 'PGK' && <p className="mb-2 text-sm font-medium text-slate-600">Pilih semua jawaban yang benar (boleh lebih dari satu).</p>}
        {(soal.tipe === 'PG' || soal.tipe === 'PGK') && (
          <ul className="space-y-2.5">
            {soal.opsi.map((o, i) => {
              const dipilih = soal.tipe === 'PG' ? isi === o.id : Array.isArray(isi) && isi.includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={terkunci}
                    onClick={() => {
                      if (soal.tipe === 'PG') onUbah(dipilih ? null : o.id, true);
                      else {
                        const arr = Array.isArray(isi) ? isi : [];
                        onUbah(dipilih ? arr.filter((x) => x !== o.id) : [...arr, o.id], true);
                      }
                    }}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-[15px] transition-colors disabled:cursor-not-allowed ${
                      dipilih ? 'border-navy bg-navy-light' : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${terkunci ? 'opacity-70' : ''}`}
                    aria-pressed={dipilih}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center font-heading text-sm font-bold ${
                        soal.tipe === 'PGK' ? 'rounded-md' : 'rounded-full'
                      } ${dipilih ? 'bg-navy text-white' : 'border border-slate-300 text-slate-600'}`}
                    >
                      {soal.tipe === 'PGK' && dipilih ? <Check className="h-4 w-4" /> : HURUF[i]}
                    </span>
                    <span className="flex-1">{o.teks}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {soal.tipe === 'BS' && (
          <div className="grid grid-cols-2 gap-3">
            {soal.opsi.map((o) => {
              const dipilih = isi === o.id;
              const benar = o.teks === 'Benar';
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={terkunci}
                  onClick={() => onUbah(dipilih ? null : o.id, true)}
                  aria-pressed={dipilih}
                  className={`flex min-h-[60px] items-center justify-center gap-2 rounded-xl border-2 font-heading text-base font-bold transition-colors disabled:cursor-not-allowed ${
                    dipilih
                      ? benar
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-rose-600 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {benar ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />} {o.teks}
                </button>
              );
            })}
          </div>
        )}
        {soal.tipe === 'ESAI' && (
          <KolomEsai key={soal.id} nilai={typeof isi === 'string' ? isi : ''} onUbah={onUbah} terkunci={terkunci} blokirTempel={blokirTempel} hitungan={soal.hitungan} />
        )}
      </div>

      {zoom && <ZoomGambar src={srcGambar(zoom)} onTutup={() => setZoom(null)} />}
    </div>
  );
}

function KolomEsai({
  nilai,
  onUbah,
  terkunci,
  blokirTempel,
  hitungan,
}: {
  nilai: string;
  onUbah: (isi: IsiJawaban, segera: boolean) => void;
  terkunci: boolean;
  blokirTempel: boolean;
  hitungan: boolean;
}) {
  const [teks, setTeks] = useState(nilai);
  const ref = useRef(nilai);
  useEffect(() => {
    if (nilai !== ref.current) {
      setTeks(nilai);
      ref.current = nilai;
    }
  }, [nilai]);
  return (
    <div>
      <label className="label" htmlFor="esai">
        {hitungan ? 'Jawaban akhir' : 'Jawaban Anda'}
      </label>
      <textarea
        id="esai"
        className="input min-h-[160px] resize-y py-2.5 leading-relaxed"
        value={teks}
        disabled={terkunci}
        placeholder={hitungan ? 'Tuliskan jawaban akhir di sini…' : 'Ketik jawaban di sini…'}
        onChange={(e) => {
          setTeks(e.target.value);
          ref.current = e.target.value;
          onUbah(e.target.value, false);
        }}
        onBlur={() => onUbah(ref.current, true)}
        onPaste={(e) => blokirTempel && e.preventDefault()}
        onDrop={(e) => blokirTempel && e.preventDefault()}
        spellCheck={false}
        autoComplete="off"
      />
      <p className="mt-1 text-right text-xs text-slate-400">{teks.length} karakter</p>
    </div>
  );
}

function ZoomGambar({ src, onTutup }: { src: string; onTutup: () => void }) {
  const [skala, setSkala] = useState(1);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95" role="dialog" aria-label="Gambar diperbesar">
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex gap-2">
          <button className="btn btn-kecil bg-white/10 text-white" onClick={() => setSkala((s) => Math.max(0.5, s - 0.5))} aria-label="Perkecil">
            <Minus className="h-4 w-4" />
          </button>
          <span className="flex items-center px-1 text-sm text-white angka">{Math.round(skala * 100)}%</span>
          <button className="btn btn-kecil bg-white/10 text-white" onClick={() => setSkala((s) => Math.min(4, s + 0.5))} aria-label="Perbesar">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button className="btn btn-kecil bg-white text-slate-900" onClick={onTutup}>
          <X className="h-4 w-4" /> Tutup
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3" style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Gambar soal diperbesar"
          draggable={false}
          style={{ width: `${skala * 100}%`, maxWidth: 'none' }}
          className="mx-auto block rounded-lg bg-white"
        />
      </div>
    </div>
  );
}
