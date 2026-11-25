'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ClipboardList,
  Download,
  Expand,
  FileClock,
  KeyRound,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { formatSisa } from '@/lib/jamServer';
import { LABEL_SINGKAT } from '@/lib/labelAktivitas';

type Baris = {
  id: number;
  nama: string;
  noUrut: number;
  nis: string;
  kelas: string;
  status: 'BELUM_MASUK' | 'MENGERJAKAN' | 'SUDAH_KUMPUL' | 'TIDAK_HADIR';
  kehadiran: string;
  jamMasuk: string | null;
  jamKumpul: string | null;
  caraKumpul: string | null;
  dijawab: number;
  totalSoal: number;
  pelanggaran: number;
  sedangKeluar: boolean;
  online: boolean;
  loginAktif: boolean;
  perangkat: string | null;
  aktivitas: { kode: string; waktu: string } | null;
};
type Data = {
  serverNow: string;
  sesi: { id: number; token: string; fase: string; paketFinal: boolean; mulai: string; selesai: string; batasEdit: string; batasKumpul: string; ditutup: boolean };
  baris: Baris[];
  ringkas: { terdaftar: number; belumMasuk: number; mengerjakan: number; sudahKumpul: number; tidakHadir: number; online: number; pelanggar: number };
};
type Info = { mapel: string; jenisUjian: string; guru: string; tipe: string; kelas: { id: number; nama: string }[]; batasTerlambat: number };

const jam = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace(/\./g, ':') : '—';

const LABEL_FASE: Record<string, string> = {
  BELUM_MULAI: 'Belum dimulai',
  BERLANGSUNG: 'Berlangsung',
  TOLERANSI_EDIT: 'Toleransi edit',
  TOLERANSI_KUMPUL: 'Toleransi kumpul',
  DITUTUP: 'Ditutup',
};
const STATUS: Record<Baris['status'], [string, string]> = {
  BELUM_MASUK: ['Belum masuk', 'bg-slate-100 text-slate-600'],
  MENGERJAKAN: ['Mengerjakan', 'bg-blue-100 text-navy'],
  SUDAH_KUMPUL: ['Sudah kumpul', 'bg-emerald-100 text-emerald-700'],
  TIDAK_HADIR: ['Tidak hadir', 'bg-rose-100 text-rose-700'],
};
const CARA: Record<string, string> = { MANUAL: 'manual', OTOMATIS: 'otomatis', PAKSA_ADMIN: 'dipaksa admin' };

type Aksi = { aksi: string; pesertaId?: number; judul: string; isi: string; token?: string };

export function Pantau({ sesiId, info }: { sesiId: number; info: Info }) {
  const [d, setD] = useState<Data | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kelas, setKelas] = useState('SEMUA');
  const [filter, setFilter] = useState('SEMUA');
  const [urut, setUrut] = useState<'NO' | 'PELANGGARAN'>('NO');
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [tokenBesar, setTokenBesar] = useState(false);
  const [editToken, setEditToken] = useState(false);
  const [tokenBaru, setTokenBaru] = useState('');
  const [notif, setNotif] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const sebelumnya = useRef<Map<number, number> | null>(null);
  const offset = useRef(0);

  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/sesi/${sesiId}/pantau`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) return setGalat(j.pesan);
      offset.current = Date.parse(j.serverNow) - Date.now();
      setGalat(null);
      // PANTAU-07: notifikasi saat siswa mencapai pelanggaran ke-3
      const lama = sebelumnya.current;
      if (lama) {
        const baru = (j.baris as Baris[]).filter((b) => b.pelanggaran >= 3 && (lama.get(b.id) ?? 0) < 3).map((b) => `${b.nama} (${b.kelas}) mencapai pelanggaran ke-${b.pelanggaran}`);
        if (baru.length) setNotif((n) => [...baru, ...n].slice(0, 5));
      }
      sebelumnya.current = new Map((j.baris as Baris[]).map((b) => [b.id, b.pelanggaran]));
      setD(j);
    } catch {
      setGalat('Gagal memuat data. Mencoba lagi…');
    }
  }, [sesiId]);

  useEffect(() => {
    muat();
    const id = setInterval(muat, 5000);
    const id2 = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, [muat]);

  const baris = useMemo(() => {
    if (!d) return [];
    let b = d.baris;
    if (kelas !== 'SEMUA') b = b.filter((x) => x.kelas === kelas);
    if (filter === 'PELANGGAR') b = b.filter((x) => x.pelanggaran > 0);
    else if (filter !== 'SEMUA') b = b.filter((x) => x.status === filter);
    if (urut === 'PELANGGARAN') b = [...b].sort((x, y) => y.pelanggaran - x.pelanggaran || x.noUrut - y.noUrut);
    return b;
  }, [d, kelas, filter, urut]);

  async function jalankan(a: Aksi) {
    setProses(true);
    try {
      const r = await fetch(`/api/admin/sesi/${sesiId}/aksi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi: a.aksi, pesertaId: a.pesertaId, token: a.token }),
      });
      const j = await r.json();
      setPesan(j.pesan ?? (r.ok ? 'Berhasil.' : 'Gagal.'));
      if (r.ok) {
        setAksi(null);
        setEditToken(false);
      }
      await muat();
    } finally {
      setProses(false);
    }
  }

  if (!d)
    return (
      <div className="flex items-center gap-2 text-slate-500">
        {galat ?? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </>
        )}
      </div>
    );

  const s = d.sesi;
  const nowS = now + offset.current;
  const target = s.fase === 'BELUM_MULAI' ? s.mulai : s.fase === 'BERLANGSUNG' ? s.selesai : s.fase === 'TOLERANSI_EDIT' ? s.batasEdit : s.batasKumpul;
  const labelTarget = s.fase === 'BELUM_MULAI' ? 'mulai dalam' : s.fase === 'BERLANGSUNG' ? 'sisa waktu' : s.fase === 'TOLERANSI_EDIT' ? 'jawaban terkunci dalam' : 'paksa kumpul otomatis dalam';
  const R = d.ringkas;

  return (
    <>
      <Link href="/admin/beranda" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Jadwal
      </Link>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {info.mapel} · {info.kelas.map((k) => k.nama).join(', ')}
            </h1>
            {info.tipe === 'SUSULAN' && <span className="lencana bg-violet-100 text-violet-700">Susulan</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {info.jenisUjian} · {jam(s.mulai)}–{jam(s.selesai)} WIB · batas terlambat {info.batasTerlambat} menit · penyusun {info.guru}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`lencana ${s.fase === 'BERLANGSUNG' ? 'bg-blue-100 text-navy' : s.fase === 'DITUTUP' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{LABEL_FASE[s.fase]}</span>
            {s.fase !== 'DITUTUP' && (
              <span className="text-sm text-slate-600">
                {labelTarget} <strong className="angka font-mono text-slate-900">{formatSisa(Date.parse(target) - nowS)}</strong>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3" /> diperbarui tiap 5 detik
            </span>
          </div>
        </div>
        <div className="kartu flex items-center gap-3 p-3">
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <KeyRound className="h-3.5 w-3.5" /> Token
            </div>
            <div className="angka font-mono text-3xl font-bold tracking-[0.2em] text-navy">{s.token}</div>
          </div>
          <div className="flex flex-col gap-1">
            <button className="btn-garis btn-kecil" onClick={() => setTokenBesar(true)}>
              <Expand className="h-3.5 w-3.5" /> Tampilkan besar
            </button>
            <div className="flex gap-1">
              <button
                className="btn-garis btn-kecil flex-1"
                onClick={() => {
                  setTokenBaru(s.token);
                  setEditToken(true);
                }}
                disabled={s.ditutup}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                className="btn-garis btn-kecil flex-1"
                disabled={s.ditutup}
                onClick={() => setAksi({ aksi: 'TOKEN_BUAT_ULANG', judul: 'Buat ulang token?', isi: 'Sistem membuat token 6 digit baru. Token lama langsung tidak berlaku bagi siswa yang belum masuk.' })}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Baru
              </button>
            </div>
          </div>
        </div>
      </div>

      {!s.paketFinal && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-600 p-3 text-sm font-medium text-white">
          <AlertTriangle className="h-4 w-4" /> Paket soal belum Final. Siswa tidak dapat memulai ujian sampai guru memfinalkan paket.
        </div>
      )}
      {notif.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="flex items-center justify-between">
            <strong className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" /> Notifikasi pelanggaran
            </strong>
            <button onClick={() => setNotif([])} aria-label="Tutup notifikasi">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-1 list-disc pl-5">
            {notif.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {pesan && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-navy-light p-3 text-sm text-navy">
          {pesan}
          <button onClick={() => setPesan(null)} aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ['Terdaftar', R.terdaftar, 'text-slate-900'],
          ['Belum masuk', R.belumMasuk, 'text-slate-600'],
          ['Mengerjakan', R.mengerjakan, 'text-navy'],
          ['Sudah kumpul', R.sudahKumpul, 'text-emerald-700'],
          ['Tidak hadir', R.tidakHadir, 'text-rose-700'],
          ['Online', R.online, 'text-emerald-700'],
          ['≥ 3 pelanggaran', R.pelanggar, 'text-rose-600'],
        ].map(([l, n, c]) => (
          <div key={l as string} className="kartu p-3">
            <div className="text-xs text-slate-500">{l}</div>
            <div className={`angka font-heading text-2xl font-bold ${c}`}>{n}</div>
          </div>
        ))}
      </div>

      <div className="kartu overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <select className="input w-auto min-h-[38px] py-1 text-sm" value={kelas} onChange={(e) => setKelas(e.target.value)} aria-label="Filter kelas">
            <option value="SEMUA">Semua kelas</option>
            {info.kelas.map((k) => (
              <option key={k.id}>{k.nama}</option>
            ))}
          </select>
          <select className="input w-auto min-h-[38px] py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter status">
            <option value="SEMUA">Semua status</option>
            <option value="BELUM_MASUK">Belum masuk</option>
            <option value="MENGERJAKAN">Mengerjakan</option>
            <option value="SUDAH_KUMPUL">Sudah kumpul</option>
            <option value="TIDAK_HADIR">Tidak hadir</option>
            <option value="PELANGGAR">Ada pelanggaran</option>
          </select>
          <select className="input w-auto min-h-[38px] py-1 text-sm" value={urut} onChange={(e) => setUrut(e.target.value as 'NO' | 'PELANGGARAN')} aria-label="Urutkan">
            <option value="NO">Urut: No. urut</option>
            <option value="PELANGGARAN">Urut: pelanggaran terbanyak</option>
          </select>
          <div className="ml-auto flex flex-wrap gap-2">
            {R.mengerjakan > 0 && (
              <button
                className="btn-bahaya btn-kecil"
                onClick={() => setAksi({ aksi: 'PAKSA_KUMPUL_SEMUA', judul: 'Paksa kumpul seluruh sesi?', isi: `${R.mengerjakan} siswa yang sedang mengerjakan akan dikumpulkan sekarang dengan jawaban terakhir yang tersimpan.` })}
              >
                <Send className="h-3.5 w-3.5" /> Paksa kumpul semua
              </button>
            )}
            {s.ditutup && R.tidakHadir > 0 && (
              <Link href={`/admin/sesi/${sesiId}/susulan`} className="btn-primer btn-kecil">
                <UserPlus className="h-3.5 w-3.5" /> Buat sesi susulan
              </Link>
            )}
            {info.kelas.map((k) => (
              <a key={k.id} href={`/api/rekap?sesiId=${sesiId}&kelasId=${k.id}`} className="btn-garis btn-kecil">
                <Download className="h-3.5 w-3.5" /> Excel {k.nama}
              </a>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tabel">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Status</th>
                <th>Jam masuk</th>
                <th>Progres</th>
                <th>Aktivitas terakhir</th>
                <th>Online</th>
                <th>Pelanggaran</th>
                <th>Perangkat</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id} className={b.pelanggaran >= 3 ? 'bg-rose-50' : 'hover:bg-slate-50'}>
                  <td className="angka text-slate-500">{b.noUrut}</td>
                  <td>
                    <div className={`whitespace-nowrap font-semibold ${b.pelanggaran >= 3 ? 'text-rose-700' : ''}`}>{b.nama}</div>
                    <div className="text-xs text-slate-500">
                      {b.kelas} · <span className="font-mono">{b.nis}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`lencana ${STATUS[b.status][1]}`}>{STATUS[b.status][0]}</span>
                    {b.status === 'SUDAH_KUMPUL' && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {jam(b.jamKumpul)} · {CARA[b.caraKumpul ?? ''] ?? ''}
                      </div>
                    )}
                  </td>
                  <td className="angka whitespace-nowrap text-sm">
                    {jam(b.jamMasuk)}
                    {b.kehadiran === 'TERLAMBAT' && <div className="text-xs font-semibold text-amber-700">Terlambat</div>}
                    {b.kehadiran === 'HADIR' && <div className="text-xs text-emerald-700">Hadir</div>}
                  </td>
                  <td className="min-w-[110px]">
                    <div className="angka text-sm">
                      {b.dijawab}/{b.totalSoal}
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-navy" style={{ width: `${b.totalSoal ? (b.dijawab / b.totalSoal) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-600">
                    {b.aktivitas ? (
                      <>
                        {LABEL_SINGKAT[b.aktivitas.kode] ?? b.aktivitas.kode}
                        <div className="angka text-slate-400">{jam(b.aktivitas.waktu)}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {b.status === 'MENGERJAKAN' ? (
                      b.online ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Wifi className="h-3.5 w-3.5" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <WifiOff className="h-3.5 w-3.5" /> Offline
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`angka inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-sm font-bold ${
                        b.pelanggaran >= 3 ? 'bg-rose-600 text-white' : b.pelanggaran > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {b.pelanggaran}
                    </span>
                    {b.sedangKeluar && <div className="mt-0.5 text-xs font-semibold text-rose-600">sedang keluar</div>}
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{b.perangkat ?? '—'}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-garis btn-kecil"
                        disabled={!b.loginAktif}
                        title={b.loginAktif ? 'Reset login' : 'Tidak ada login aktif'}
                        onClick={() =>
                          setAksi({ aksi: 'RESET_LOGIN', pesertaId: b.id, judul: `Reset login ${b.nama}?`, isi: 'Sesi login di perangkat lama berakhir. Siswa dapat login di perangkat baru, memasukkan token lagi, dan melanjutkan dengan jawaban yang sudah tersimpan.' })
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                      </button>
                      <button
                        className="btn-garis btn-kecil"
                        disabled={b.status !== 'MENGERJAKAN'}
                        onClick={() => setAksi({ aksi: 'PAKSA_KUMPUL', pesertaId: b.id, judul: `Paksa kumpul ${b.nama}?`, isi: 'Jawaban terakhir yang tersimpan langsung dikumpulkan dan siswa tidak dapat mengubahnya lagi.' })}
                      >
                        <Send className="h-3.5 w-3.5" /> Kumpul
                      </button>
                      <Link href={`/admin/log/${b.id}`} className="btn-garis btn-kecil">
                        <FileClock className="h-3.5 w-3.5" /> Log
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!baris.length && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    <ClipboardList className="mx-auto mb-1 h-5 w-5" /> Tidak ada siswa untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {aksi && (
        <Modal label="Konfirmasi tindakan" onTutup={() => !proses && setAksi(null)}>
          <h3 className="text-lg font-bold">{aksi.judul}</h3>
          <p className="mt-2 text-sm text-slate-600">{aksi.isi}</p>
          <p className="mt-2 text-xs text-slate-500">Tindakan ini dicatat di log.</p>
          <div className="mt-5 flex gap-2">
            <button className="btn-garis flex-1" onClick={() => setAksi(null)} disabled={proses}>
              Batal
            </button>
            <button className={`${aksi.aksi.startsWith('PAKSA') ? 'btn-bahaya' : 'btn-primer'} flex-1`} onClick={() => jalankan(aksi)} disabled={proses}>
              {proses && <Loader2 className="h-4 w-4 animate-spin" />} Ya, lanjutkan
            </button>
          </div>
        </Modal>
      )}
      {editToken && (
        <Modal label="Edit token" onTutup={() => setEditToken(false)}>
          <h3 className="text-lg font-bold">Edit token</h3>
          <p className="mt-1 text-sm text-slate-600">Tepat 6 digit angka. Token lama langsung tidak berlaku bagi siswa yang belum masuk.</p>
          <input
            className="input mt-4 text-center font-mono text-2xl tracking-[0.4em]"
            value={tokenBaru}
            onChange={(e) => setTokenBaru(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoFocus
          />
          <div className="mt-5 flex gap-2">
            <button className="btn-garis flex-1" onClick={() => setEditToken(false)}>
              Batal
            </button>
            <button
              className="btn-primer flex-1"
              disabled={tokenBaru.length !== 6 || proses}
              onClick={() => jalankan({ aksi: 'TOKEN_EDIT', token: tokenBaru, judul: '', isi: '' })}
            >
              Simpan token
            </button>
          </div>
        </Modal>
      )}
      {tokenBesar && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-navy to-navy-dark p-6 text-white" onClick={() => setTokenBesar(false)}>
          <p className="font-heading text-2xl text-emas">
            Token {info.mapel} · {info.kelas.map((k) => k.nama).join(', ')}
          </p>
          <p className="angka mt-4 font-mono text-[18vw] font-bold leading-none tracking-[0.15em] sm:text-[12vw]">{s.token}</p>
          <p className="mt-6 text-blue-200">Ketuk di mana saja untuk menutup</p>
        </div>
      )}
    </>
  );
}
