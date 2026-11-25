'use client';

import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Eye, ImageIcon, Lock, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { srcGambar } from '@/components/ujian/TampilanSoal';
import { FormSoal, SoalEdit } from './FormSoal';
import { Pratinjau } from './Pratinjau';

type Paket = { id: number; judul: string; mapel: string; tingkat: string; jenisUjian: string; status: string; terkunci: boolean; jumlahSesi: number };
type Validasi = { masalah: string[]; perTipe: Record<string, number>; totalBobot: number; jumlah: number };

const LABEL: Record<string, string> = { PG: 'Pilihan ganda', PGK: 'PG kompleks', BS: 'Benar/Salah', ESAI: 'Esai' };

export function EditorPaket({ paket, soal, validasi }: { paket: Paket; soal: SoalEdit[]; validasi: Validasi }) {
  const router = useRouter();
  const [edit, setEdit] = useState<SoalEdit | 'baru' | null>(null);
  const [pratinjau, setPratinjau] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<'FINAL' | 'DRAF' | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [masalah, setMasalah] = useState<string[]>([]);
  const final = paket.status === 'FINAL';

  async function ubahStatus(aksi: 'FINAL' | 'DRAF') {
    setGalat(null);
    const r = await fetch(`/api/guru/paket/${paket.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi }) });
    const j = await r.json();
    setKonfirmasi(null);
    if (!r.ok) {
      setGalat(j.pesan);
      setMasalah(j.masalah ?? []);
      return;
    }
    setMasalah([]);
    router.refresh();
  }
  async function hapus(s: SoalEdit) {
    if (!confirm(`Hapus soal nomor ${s.nomor}?`)) return;
    const r = await fetch(`/api/guru/soal/${s.id}`, { method: 'DELETE' });
    if (!r.ok) setGalat((await r.json()).pesan);
    router.refresh();
  }

  return (
    <>
      <Link href="/guru/beranda" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{paket.judul}</h1>
            {final ? <span className="lencana bg-emerald-100 text-emerald-700">Final</span> : <span className="lencana bg-amber-100 text-amber-800">Draf</span>}
            {paket.terkunci && (
              <span className="lencana bg-slate-200 text-slate-700">
                <Lock className="h-3 w-3" /> Terkunci
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {paket.mapel} · Kelas {paket.tingkat} · {paket.jenisUjian}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-garis" onClick={() => setPratinjau(true)} disabled={!soal.length}>
            <Eye className="h-4 w-4" /> Pratinjau tampilan siswa
          </button>
          {!final && (
            <button className="btn-primer" onClick={() => setEdit('baru')}>
              <Plus className="h-4 w-4" /> Tambah soal
            </button>
          )}
        </div>
      </div>

      {galat && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <strong>{galat}</strong>
          {masalah.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {masalah.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {soal.map((s) => (
            <article key={s.id} className="kartu p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy font-heading text-sm font-bold text-white">{s.nomor}</span>
                  <span className="lencana bg-slate-100 text-slate-700">{LABEL[s.tipe]}</span>
                  <span className="lencana bg-slate-100 text-slate-700">Bobot {s.bobot}</span>
                  {s.hitungan && (
                    <span className="lencana bg-amber-100 text-amber-800">
                      <Calculator className="h-3 w-3" /> Soal hitungan
                    </span>
                  )}
                  {s.gambar.length > 0 && (
                    <span className="lencana bg-blue-50 text-navy">
                      <ImageIcon className="h-3 w-3" /> {s.gambar.length} gambar
                    </span>
                  )}
                </div>
                {!final && (
                  <div className="flex shrink-0 gap-1">
                    <button className="btn-garis btn-kecil" onClick={() => setEdit(s)} aria-label={`Ubah soal ${s.nomor}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn btn-kecil border border-rose-200 bg-white text-rose-600 hover:bg-rose-50" onClick={() => hapus(s)} aria-label={`Hapus soal ${s.nomor}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[15px]">{s.teks}</p>
              {s.gambar.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.gambar.map((g) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={srcGambar(g)} alt="" className="h-24 rounded-lg border border-slate-200 bg-white object-contain" />
                  ))}
                </div>
              )}
              {s.tipe !== 'ESAI' ? (
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {s.opsi.map((o, i) => (
                    <li key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${o.benar ? 'bg-emerald-50 font-semibold text-emerald-800' : 'bg-slate-50 text-slate-700'}`}>
                      {o.benar ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="w-4 text-center text-xs text-slate-400">{String.fromCharCode(65 + i)}</span>}
                      {o.teks}
                    </li>
                  ))}
                </ul>
              ) : (
                s.pedoman && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600">
                    <strong className="text-slate-800">Pedoman (hanya guru):</strong> {s.pedoman}
                  </p>
                )
              )}
            </article>
          ))}
          {!soal.length && <div className="kartu p-10 text-center text-slate-500">Belum ada soal. Tekan “Tambah soal” untuk mulai.</div>}
        </section>

        <aside>
          <div className="kartu sticky top-4 p-4">
            <h2 className="font-bold">Ringkasan paket</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(LABEL).map(([k, l]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-2.5">
                  <dt className="text-xs text-slate-500">{l}</dt>
                  <dd className="angka font-heading text-lg font-bold">{validasi.perTipe[k] ?? 0}</dd>
                </div>
              ))}
              <div className="rounded-lg bg-navy-light p-2.5">
                <dt className="text-xs text-navy">Jumlah soal</dt>
                <dd className="angka font-heading text-lg font-bold text-navy">{validasi.jumlah}</dd>
              </div>
              <div className="rounded-lg bg-navy-light p-2.5">
                <dt className="text-xs text-navy">Total bobot</dt>
                <dd className="angka font-heading text-lg font-bold text-navy">{validasi.totalBobot}</dd>
              </div>
            </dl>
            <div className="mt-4">
              {validasi.masalah.length ? (
                <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Perlu dilengkapi
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                    {validasi.masalah.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Semua soal lengkap dan siap difinalkan.
                </p>
              )}
            </div>
            {final ? (
              <>
                <p className="mt-4 text-sm text-slate-600">Paket Final sudah terlihat “siap” oleh admin.</p>
                <button className="btn-garis mt-2 w-full" onClick={() => setKonfirmasi('DRAF')} disabled={paket.terkunci}>
                  <Undo2 className="h-4 w-4" /> Batalkan status Final
                </button>
                {paket.terkunci && <p className="mt-2 text-xs text-slate-500">Tidak dapat dibatalkan: sesi ujian yang memakai paket ini sudah dimulai.</p>}
              </>
            ) : (
              <button className="btn-emas mt-4 w-full" onClick={() => setKonfirmasi('FINAL')} disabled={!soal.length}>
                <CheckCircle2 className="h-4 w-4" /> Finalkan paket
              </button>
            )}
          </div>
        </aside>
      </div>

      {edit && (
        <FormSoal
          paketId={paket.id}
          awal={edit === 'baru' ? null : edit}
          nomorBaru={soal.length + 1}
          onTutup={() => setEdit(null)}
          onSimpan={() => {
            setEdit(null);
            router.refresh();
          }}
        />
      )}
      {pratinjau && <Pratinjau soal={soal} onTutup={() => setPratinjau(false)} />}
      {konfirmasi && (
        <Modal label="Konfirmasi" onTutup={() => setKonfirmasi(null)}>
          <h3 className="text-lg font-bold">{konfirmasi === 'FINAL' ? 'Finalkan paket soal?' : 'Batalkan status Final?'}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {konfirmasi === 'FINAL'
              ? `Sistem memeriksa kelengkapan ${validasi.jumlah} soal (total bobot ${validasi.totalBobot}). Setelah Final, admin melihat paket ini “siap” dan soal tidak dapat diubah kecuali status Final dibatalkan sebelum ujian dimulai.`
              : 'Paket kembali menjadi Draf dan sesi yang memakainya ditandai merah di dashboard admin sampai difinalkan lagi.'}
          </p>
          <div className="mt-5 flex gap-2">
            <button className="btn-garis flex-1" onClick={() => setKonfirmasi(null)}>
              Batal
            </button>
            <button className={konfirmasi === 'FINAL' ? 'btn-emas flex-1' : 'btn-primer flex-1'} onClick={() => ubahStatus(konfirmasi)}>
              {konfirmasi === 'FINAL' ? 'Ya, finalkan' : 'Ya, batalkan'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
