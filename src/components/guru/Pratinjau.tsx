'use client';

import { ChevronLeft, ChevronRight, Monitor, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { PanelNomor } from '@/components/ujian/LayarUjian';
import { TampilanSoal } from '@/components/ujian/TampilanSoal';
import { IsiJawaban, JawabanSiswa, SoalSiswa } from '@/components/ujian/tipe';
import type { SoalEdit } from './FormSoal';

/** SOAL-07: pratinjau tampilan siswa dalam mode HP dan desktop. Kunci jawaban tidak ditandai. */
export function Pratinjau({ soal, onTutup }: { soal: SoalEdit[]; onTutup: () => void }) {
  const [mode, setMode] = useState<'hp' | 'desktop'>('hp');
  const [idx, setIdx] = useState(0);
  const [jawab, setJawab] = useState<Record<string, JawabanSiswa>>({});
  const daftar: SoalSiswa[] = soal.map((s) => ({
    id: s.id,
    nomor: s.nomor,
    tipe: s.tipe,
    teks: s.teks,
    gambar: s.gambar,
    hitungan: s.hitungan,
    opsi: s.opsi.map((o, i) => ({ id: o.id ?? i, teks: o.teks })),
  }));
  const s = daftar[idx];
  const ubah = (isi: IsiJawaban) => setJawab((j) => ({ ...j, [s.id]: { isi, ragu: false } }));
  const isi = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <div className="text-sm font-bold">Nama Siswa (pratinjau)</div>
        <div className="text-xs text-slate-500">No. 1 · Kelas · Mapel</div>
      </div>
      <div className={`flex-1 overflow-auto bg-slate-100 p-3 ${mode === 'desktop' ? 'grid grid-cols-[1fr_240px] gap-3' : ''}`}>
        <div className="kartu p-4">
          <TampilanSoal soal={s} isi={jawab[s.id]?.isi ?? null} onUbah={(v) => ubah(v)} blokirTempel={false} />
          <div className="mt-4 flex justify-between gap-2 border-t border-slate-100 pt-3">
            <button className="btn-garis btn-kecil" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-primer btn-kecil" disabled={idx === daftar.length - 1} onClick={() => setIdx(idx + 1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {mode === 'desktop' && (
          <div className="kartu h-fit p-3">
            <PanelNomor soal={daftar} jawaban={jawab} aktif={idx} onPilih={setIdx} />
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/90 p-3" role="dialog" aria-label="Pratinjau">
      <div className="mx-auto mb-3 flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-white/10 p-1">
          <button className={`btn btn-kecil ${mode === 'hp' ? 'bg-white text-navy' : 'text-white'}`} onClick={() => setMode('hp')}>
            <Smartphone className="h-4 w-4" /> HP (360 px)
          </button>
          <button className={`btn btn-kecil ${mode === 'desktop' ? 'bg-white text-navy' : 'text-white'}`} onClick={() => setMode('desktop')}>
            <Monitor className="h-4 w-4" /> Desktop
          </button>
        </div>
        <span className="text-sm text-slate-300">Urutan opsi pilihan ganda akan diacak per siswa saat ujian.</span>
        <button className="btn btn-kecil bg-white text-slate-900" onClick={onTutup}>
          <X className="h-4 w-4" /> Tutup
        </button>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto">
        {mode === 'hp' ? (
          <div className="h-[720px] max-h-full w-[360px] overflow-hidden rounded-[28px] border-[8px] border-slate-950 bg-white shadow-2xl">{isi}</div>
        ) : (
          <div className="h-[640px] max-h-full w-full max-w-5xl overflow-hidden rounded-xl border-4 border-slate-950 bg-white shadow-2xl">{isi}</div>
        )}
      </div>
    </div>
  );
}
