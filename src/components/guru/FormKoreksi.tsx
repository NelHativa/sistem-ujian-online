'use client';

import { AlertTriangle, Calculator, Check, ChevronLeft, ChevronRight, CircleSlash, Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { srcGambar } from '@/components/ujian/TampilanSoal';

type Soal = {
  id: number;
  nomor: number;
  tipe: string;
  teks: string;
  bobot: number;
  gambar: string[];
  hitungan: boolean;
  pedoman: string | null;
  opsi: { id: number; teks: string; benar: boolean }[];
  isi: number | number[] | string | null;
  benar: boolean | null;
};

type Props = {
  pesertaId: number;
  siswa: { nama: string; noUrut: number; kelas: string; nis: string };
  mapel: string;
  pelanggaran: number;
  soal: Soal[];
  poinEsaiAwal: Record<string, number>;
  nilaiAkhirAwal: number | null;
  catatanAwal: string;
  sebelumnya: string | null;
  berikutnya: string | null;
  posisi: string;
};

const LABEL: Record<string, string> = { PG: 'Pilihan ganda', PGK: 'PG kompleks', BS: 'Benar/Salah', ESAI: 'Esai' };

export function FormKoreksi(p: Props) {
  const router = useRouter();
  const [poin, setPoin] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(p.poinEsaiAwal).map(([k, v]) => [k, String(v)])));
  const [nilaiAkhir, setNilaiAkhir] = useState(p.nilaiAkhirAwal != null ? String(p.nilaiAkhirAwal) : '');
  const [catatan, setCatatan] = useState(p.catatanAwal);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const h = useMemo(() => {
    let total = 0;
    let obj = 0;
    let totObj = 0;
    let esai = 0;
    for (const s of p.soal) {
      total += s.bobot;
      if (s.tipe === 'ESAI') {
        const v = Number(poin[s.id]);
        if (poin[s.id] !== undefined && poin[s.id] !== '' && Number.isFinite(v)) esai += Math.min(Math.max(v, 0), s.bobot);
      } else {
        totObj += s.bobot;
        if (s.benar) obj += s.bobot;
      }
    }
    return { total, obj, totObj, esai, saran: total ? Math.round(((obj + esai) / total) * 100) : 0 };
  }, [p.soal, poin]);

  const nilaiValid = nilaiAkhir === '' || /^\d+$/.test(nilaiAkhir.trim()) ? (nilaiAkhir === '' || Number(nilaiAkhir) <= 100 ? null : 'Nilai Akhir harus di antara 0 dan 100.') : 'Nilai Akhir harus bilangan bulat tanpa koma (0–100).';

  async function simpan() {
    setProses(true);
    setGalat(null);
    setPesan(null);
    const poinEsai = Object.fromEntries(Object.entries(poin).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
    const r = await fetch(`/api/guru/nilai/${p.pesertaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poinEsai, nilaiAkhir, catatan }),
    });
    const j = await r.json();
    setProses(false);
    if (!r.ok) return setGalat(j.pesan);
    setPesan('Nilai tersimpan.');
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="space-y-3">
        <div className="kartu p-4">
          <h1 className="text-xl font-bold">{p.siswa.nama}</h1>
          <p className="text-sm text-slate-600">
            No. {p.siswa.noUrut} · {p.siswa.kelas} · NIS <span className="font-mono">{p.siswa.nis}</span> · {p.mapel}
          </p>
          {p.pelanggaran > 0 && (
            <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${p.pelanggaran >= 3 ? 'text-rose-700' : 'text-amber-700'}`}>
              <AlertTriangle className="h-4 w-4" /> {p.pelanggaran} pelanggaran tercatat — lihat log untuk detail.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Opsi ditampilkan dalam urutan asli (bukan urutan acak siswa).</p>
        </div>
        {p.soal.map((s) => (
          <article key={s.id} className="kartu p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy font-heading text-sm font-bold text-white">{s.nomor}</span>
              <span className="lencana bg-slate-100 text-slate-700">{LABEL[s.tipe]}</span>
              <span className="lencana bg-slate-100 text-slate-700">Bobot {s.bobot}</span>
              {s.hitungan && (
                <span className="lencana bg-amber-100 text-amber-800">
                  <Calculator className="h-3 w-3" /> Hitungan · cek kertas
                </span>
              )}
              <span className="ml-auto">
                {s.benar === true && (
                  <span className="lencana bg-emerald-100 text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> Benar · {s.bobot} poin
                  </span>
                )}
                {s.benar === false &&
                  (s.isi == null || (Array.isArray(s.isi) && !s.isi.length) ? (
                    <span className="lencana bg-slate-100 text-slate-600">
                      <CircleSlash className="h-3.5 w-3.5" /> Tidak dijawab
                    </span>
                  ) : (
                    <span className="lencana bg-rose-100 text-rose-700">
                      <X className="h-3.5 w-3.5" /> Salah · 0 poin
                    </span>
                  ))}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[15px]">{s.teks}</p>
            {s.gambar.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g} src={srcGambar(g)} alt="" className="mt-2 max-h-48 rounded-lg border border-slate-200 bg-white" />
            ))}
            {s.tipe !== 'ESAI' ? (
              <ul className="mt-3 space-y-1.5">
                {s.opsi.map((o, i) => {
                  const dipilih = Array.isArray(s.isi) ? s.isi.includes(o.id) : s.isi === o.id;
                  return (
                    <li
                      key={o.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        dipilih && o.benar ? 'border-emerald-300 bg-emerald-50' : dipilih ? 'border-rose-300 bg-rose-50' : o.benar ? 'border-emerald-200 border-dashed' : 'border-slate-200'
                      }`}
                    >
                      <span className="w-5 font-heading font-bold text-slate-500">{s.tipe === 'BS' ? '' : String.fromCharCode(65 + i)}</span>
                      <span className="flex-1">{o.teks}</span>
                      {dipilih && <span className="lencana bg-slate-800 text-white">Jawaban siswa</span>}
                      {o.benar && <span className="lencana bg-emerald-600 text-white">Kunci</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Jawaban siswa</div>
                  <p className="whitespace-pre-wrap">{typeof s.isi === 'string' && s.isi.trim() ? s.isi : <em className="text-slate-400">Tidak dijawab</em>}</p>
                </div>
                {s.pedoman && <p className="text-sm text-slate-600"><strong>Pedoman:</strong> {s.pedoman}</p>}
                <label className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Poin diperoleh</span>
                  <input
                    className="input w-24 min-h-[40px] text-center angka"
                    inputMode="decimal"
                    value={poin[s.id] ?? ''}
                    onChange={(e) => setPoin((x) => ({ ...x, [s.id]: e.target.value.replace(/[^\d.]/g, '') }))}
                    placeholder="0"
                  />
                  <span className="text-slate-500">dari {s.bobot}</span>
                </label>
              </div>
            )}
          </article>
        ))}
      </section>

      <aside>
        <div className="kartu sticky top-4 space-y-4 p-4">
          <div className="flex items-center justify-between">
            {p.sebelumnya ? (
              <Link href={p.sebelumnya} className="btn-garis btn-kecil" aria-label="Siswa sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-500">Siswa {p.posisi}</span>
            {p.berikutnya ? (
              <Link href={p.berikutnya} className="btn-garis btn-kecil" aria-label="Siswa berikutnya">
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <dt className="text-xs text-slate-500">Skor objektif</dt>
              <dd className="angka font-heading text-lg font-bold">
                {h.obj}/{h.totObj}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <dt className="text-xs text-slate-500">Poin esai</dt>
              <dd className="angka font-heading text-lg font-bold">
                {h.esai}/{h.total - h.totObj}
              </dd>
            </div>
          </dl>
          <div className="rounded-xl bg-navy-light p-3">
            <div className="text-xs text-navy">Nilai saran (referensi)</div>
            <div className="flex items-end justify-between">
              <span className="angka font-heading text-3xl font-bold text-navy">{h.saran}</span>
              <button className="btn-garis btn-kecil" onClick={() => setNilaiAkhir(String(h.saran))}>
                Pakai nilai saran
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              = pembulatan({h.obj + h.esai} ÷ {h.total} × 100)
            </div>
          </div>
          <div>
            <label className="label" htmlFor="na">
              Nilai Akhir (resmi, bilangan bulat 0–100)
            </label>
            <input
              id="na"
              className={`input text-center font-heading text-2xl font-bold angka ${nilaiValid ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
              value={nilaiAkhir}
              onChange={(e) => setNilaiAkhir(e.target.value)}
              inputMode="numeric"
              placeholder="—"
            />
            {nilaiValid && <p className="mt-1 text-xs font-medium text-rose-700">{nilaiValid}</p>}
          </div>
          <div>
            <label className="label" htmlFor="cat">
              Catatan (opsional)
            </label>
            <input id="cat" className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. kertas hitungan sudah dicek" />
          </div>
          {galat && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
          {pesan && <p className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">{pesan}</p>}
          <button className="btn-primer w-full" onClick={simpan} disabled={proses}>
            {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan nilai
          </button>
          <p className="text-xs text-slate-500">Setiap perubahan nilai dicatat (siapa, kapan, nilai lama → baru). Nilai tidak pernah ditampilkan kepada siswa.</p>
        </div>
      </aside>
    </div>
  );
}
