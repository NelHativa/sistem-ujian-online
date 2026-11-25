'use client';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Flag,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize,
  Send,
  ShieldAlert,
  Timer,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { formatSisa, jamServerSekarang } from '@/lib/jamServer';
import { bunyikanSirine, pastikanAudioAktif } from '@/lib/sirine';
import { PengelolaSimpan, StatusSimpan } from './pengelolaSimpan';
import { TampilanSoal } from './TampilanSoal';
import { IsiJawaban, JawabanSiswa, SoalSiswa, terjawab } from './tipe';
import { Watermark } from './Watermark';

export type Identitas = {
  nama: string;
  nis: string;
  nisn: string | null;
  noUrut: number;
  kelas: string;
  mapel: string;
  jenisUjian: string;
  tipeSesi: string;
};
type Waktu = { mulai: string; selesai: string; batasEdit: string; batasKumpul: string };
type FaseLokal = 'BERLANGSUNG' | 'TOLERANSI_EDIT' | 'TOLERANSI_KUMPUL' | 'DITUTUP';

type Props = {
  sesiId: number;
  pesertaId: number;
  identitas: Identitas;
  waktuAwal: Waktu;
  soal: SoalSiswa[];
  jawabanAwal: Record<string, JawabanSiswa>;
  pelanggaranAwal: number;
  onSelesai: (jamKumpul: string) => void;
  onLoginHabis: () => void;
};

function hitungFase(w: Waktu, now: number): FaseLokal {
  if (now < Date.parse(w.selesai)) return 'BERLANGSUNG';
  if (now < Date.parse(w.batasEdit)) return 'TOLERANSI_EDIT';
  if (now < Date.parse(w.batasKumpul)) return 'TOLERANSI_KUMPUL';
  return 'DITUTUP';
}

const iOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function LayarUjian(p: Props) {
  const [waktu, setWaktu] = useState(p.waktuAwal);
  const [now, setNow] = useState(() => jamServerSekarang());
  const [idx, setIdx] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, JawabanSiswa>>(p.jawabanAwal);
  const [status, setStatus] = useState<StatusSimpan>('tersimpan');
  const [panelBuka, setPanelBuka] = useState(false);
  const [konfirmasiKumpul, setKonfirmasiKumpul] = useState(false);
  const [mengumpulkan, setMengumpulkan] = useState(false);
  const [galatKumpul, setGalatKumpul] = useState<string | null>(null);
  const [fokus, setFokus] = useState(true);
  const [peringatan, setPeringatan] = useState<number | null>(null);
  const [tutupLayar, setTutupLayar] = useState(false);
  const [bukanLayarPenuh, setBukanLayarPenuh] = useState(false);
  const pengelola = useRef<PengelolaSimpan | null>(null);
  const pelanggaran = useRef(p.pelanggaranAwal);
  const keluarSejak = useRef<number | null>(null);
  const selesaiRef = useRef(false);

  const fase = hitungFase(waktu, now);
  const bisaUbah = fase === 'BERLANGSUNG' || fase === 'TOLERANSI_EDIT';

  const selesai = useCallback(
    (jamKumpul: string) => {
      if (selesaiRef.current) return;
      selesaiRef.current = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      p.onSelesai(jamKumpul);
    },
    [p],
  );

  // ---------- Pengelola simpan otomatis & heartbeat ----------
  useEffect(() => {
    const m = new PengelolaSimpan(p.sesiId, p.pesertaId, {
      status: setStatus,
      pelanggaran: (n) => {
        pelanggaran.current = Math.max(pelanggaran.current, n);
      },
      loginHabis: p.onLoginHabis,
      sudahKumpul: selesai,
      detak: (d) => setWaktu(d.waktu),
    });
    pengelola.current = m;
    const tertunda = m.tertunda();
    if (Object.keys(tertunda).length) setJawaban((j) => ({ ...j, ...tertunda }));
    m.mulai();
    return () => m.hentikan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.sesiId, p.pesertaId]);

  // ---------- Jam ----------
  useEffect(() => {
    const id = setInterval(() => setNow(jamServerSekarang()), 250);
    return () => clearInterval(id);
  }, []);

  // Saat waktu ditutup: server memaksa kumpul; tunggu konfirmasinya.
  useEffect(() => {
    if (fase !== 'DITUTUP') return;
    const id = setInterval(() => pengelola.current?.detak(), 2000);
    pengelola.current?.detak();
    return () => clearInterval(id);
  }, [fase]);

  // ---------- Anti-kecurangan ----------
  const catat = useCallback((kode: string, data: Record<string, unknown> = {}) => pengelola.current?.catat(kode, data), []);

  useEffect(() => {
    document.body.classList.add('ujian-aktif');
    const blokir = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (e.type === 'selectstart' && t?.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };
    const evs = ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart', 'drop'];
    evs.forEach((ev) => document.addEventListener(ev, blokir));

    const tangkapLayar = (tombol: string) => {
      setTutupLayar(true);
      setTimeout(() => setTutupLayar(false), 3000);
      navigator.clipboard?.writeText(' ').catch(() => undefined);
      catat('PRINTSCREEN_TERDETEKSI', { tombol });
    };
    const tombol = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        tangkapLayar('PrintScreen');
        return;
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(k)) {
        e.preventDefault();
        tangkapLayar(`Cmd/Win+Shift+${e.key.toUpperCase()}`);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p', 's', 'u', 'a'].includes(k)) {
        if (k === 'a' && (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        e.preventDefault();
      }
      if (e.key === 'F12') e.preventDefault();
    };
    const tombolLepas = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') tangkapLayar('PrintScreen');
    };
    window.addEventListener('keydown', tombol, true);
    window.addEventListener('keyup', tombolLepas, true);
    const cetak = () => catat('PRINTSCREEN_TERDETEKSI', { tombol: 'Cetak (Ctrl+P)' });
    window.addEventListener('beforeprint', cetak);

    // Keluar tab / aplikasi (AMAN-06..08)
    const keluar = (jenis: string) => {
      if (selesaiRef.current || keluarSejak.current != null) return;
      keluarSejak.current = performance.now();
      pelanggaran.current += 1;
      catat('KELUAR_TAB', { jenis });
      if (pelanggaran.current >= 3) bunyikanSirine(10);
    };
    const kembali = () => {
      setFokus(true);
      if (keluarSejak.current == null) return;
      const durasiDetik = Math.round((performance.now() - keluarSejak.current) / 1000);
      keluarSejak.current = null;
      catat('KEMBALI_TAB', { durasiDetik });
      const n = pelanggaran.current;
      setPeringatan(n);
      if (n >= 3) {
        pastikanAudioAktif();
        bunyikanSirine(10);
        catat('SIRINE_DIBUNYIKAN', { urutan: n });
      }
    };
    const vis = () => {
      if (document.visibilityState === 'hidden') {
        setFokus(false);
        keluar('pindah tab/aplikasi');
      } else kembali();
    };
    const blur = () => {
      setFokus(false);
      keluar('fokus berpindah');
    };
    const focus = () => {
      if (document.visibilityState === 'visible') kembali();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    const sentuh = () => pastikanAudioAktif();
    window.addEventListener('pointerdown', sentuh);

    // Layar penuh (AMAN-05)
    const fsDidukung = !!document.fullscreenEnabled && !iOS();
    const fs = () => {
      const aktif = !!document.fullscreenElement;
      setBukanLayarPenuh(fsDidukung && !aktif);
      if (!aktif && fsDidukung && !selesaiRef.current) catat('KELUAR_LAYAR_PENUH');
    };
    setBukanLayarPenuh(fsDidukung && !document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);

    // Layar tetap menyala (AMAN-09)
    let kunci: { release: () => Promise<void> } | null = null;
    const kunciLayar = async () => {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      if (!nav.wakeLock) {
        if (!sessionStorage.getItem('wl-dicatat')) {
          sessionStorage.setItem('wl-dicatat', '1');
          catat('WAKE_LOCK_TIDAK_TERSEDIA', { alasan: window.isSecureContext ? 'tidak didukung browser' : 'butuh HTTPS' });
        }
        return;
      }
      try {
        kunci = await nav.wakeLock.request('screen');
      } catch {
        /* ditolak, mis. baterai hemat */
      }
    };
    kunciLayar();
    const visWake = () => document.visibilityState === 'visible' && kunciLayar();
    document.addEventListener('visibilitychange', visWake);

    return () => {
      document.body.classList.remove('ujian-aktif');
      evs.forEach((ev) => document.removeEventListener(ev, blokir));
      window.removeEventListener('keydown', tombol, true);
      window.removeEventListener('keyup', tombolLepas, true);
      window.removeEventListener('beforeprint', cetak);
      document.removeEventListener('visibilitychange', vis);
      document.removeEventListener('visibilitychange', visWake);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      window.removeEventListener('pointerdown', sentuh);
      document.removeEventListener('fullscreenchange', fs);
      kunci?.release().catch(() => undefined);
    };
  }, [catat]);

  // ---------- Jawaban ----------
  const soal = p.soal[idx];
  const ubah = useCallback(
    (s: SoalSiswa, isi: IsiJawaban, segera: boolean) => {
      if (!bisaUbah) return;
      setJawaban((j) => {
        const ragu = j[s.id]?.ragu ?? false;
        pengelola.current?.ubah(s.id, isi, ragu, segera);
        return { ...j, [s.id]: { isi, ragu } };
      });
    },
    [bisaUbah],
  );
  const toggleRagu = () => {
    setJawaban((j) => {
      const cur = j[soal.id] ?? { isi: null, ragu: false };
      const baru = { ...cur, ragu: !cur.ragu };
      if (bisaUbah) pengelola.current?.ubah(soal.id, baru.isi, baru.ragu, true);
      return { ...j, [soal.id]: baru };
    });
  };
  const pindah = (i: number) => {
    pengelola.current?.kirim();
    setIdx(Math.min(Math.max(i, 0), p.soal.length - 1));
    setPanelBuka(false);
    window.scrollTo({ top: 0 });
  };

  const belum = useMemo(() => p.soal.filter((s) => !terjawab(s, jawaban[s.id])).length, [p.soal, jawaban]);
  const ragu = useMemo(() => p.soal.filter((s) => jawaban[s.id]?.ragu).length, [p.soal, jawaban]);

  async function kumpulkan() {
    setMengumpulkan(true);
    setGalatKumpul(null);
    try {
      await pengelola.current?.kosongkan();
      const r = await fetch(`/api/ujian/${p.sesiId}/kumpul`, { method: 'POST', cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) return p.onLoginHabis();
      if (!r.ok) {
        setGalatKumpul(j.pesan ?? 'Gagal mengumpulkan. Coba lagi.');
        return;
      }
      selesai(j.jamKumpul);
    } catch {
      setGalatKumpul('Tidak dapat terhubung ke server. Jawaban tetap tersimpan di perangkat; coba lagi setelah koneksi pulih.');
    } finally {
      setMengumpulkan(false);
    }
  }

  // ---------- Tampilan ----------
  const sisaSelesai = Date.parse(waktu.selesai) - now;
  const warnaTimer =
    fase !== 'BERLANGSUNG'
      ? 'bg-rose-600 text-white'
      : sisaSelesai <= 5 * 60_000
        ? 'bg-rose-600 text-white'
        : sisaSelesai <= 10 * 60_000
          ? 'bg-amber-400 text-slate-900'
          : 'bg-navy text-white';

  return (
    <div className="mode-ujian flex min-h-dvh flex-col bg-slate-100">
      {/* Identitas & waktu (UJI-01, UJI-04, UJI-08) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="truncate font-heading text-[15px] font-bold leading-tight">{p.identitas.nama}</div>
            <div className="truncate text-xs text-slate-600">
              No. {p.identitas.noUrut} · {p.identitas.kelas} · <strong className="text-slate-800">{p.identitas.mapel}</strong>
              {p.identitas.tipeSesi === 'SUSULAN' && ' · Susulan'}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-base font-semibold ${warnaTimer}`} aria-live="polite">
            <Timer className="h-4 w-4" />
            <span className="angka">{fase === 'BERLANGSUNG' ? formatSisa(sisaSelesai) : fase === 'TOLERANSI_EDIT' ? formatSisa(Date.parse(waktu.batasEdit) - now) : formatSisa(Date.parse(waktu.batasKumpul) - now)}</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 pb-2 text-xs sm:px-4">
          <IndikatorSimpan status={status} />
          <span className={`lencana ${belum > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-700'}`}>{belum} soal belum dijawab</span>
          <button className="btn btn-kecil border border-slate-300 bg-white lg:hidden" onClick={() => setPanelBuka(true)}>
            <LayoutGrid className="h-4 w-4" /> Daftar soal
          </button>
        </div>
      </header>

      {fase === 'TOLERANSI_EDIT' && (
        <Pita warna="bg-amber-400 text-slate-900" ikon={<AlertTriangle className="h-4 w-4" />}>
          <strong>Waktu habis.</strong> Anda masih dapat menyelesaikan jawaban yang sedang diketik selama {formatSisa(Date.parse(waktu.batasEdit) - now)}.
        </Pita>
      )}
      {fase === 'TOLERANSI_KUMPUL' && (
        <Pita warna="bg-rose-600 text-white" ikon={<Lock className="h-4 w-4" />}>
          <strong>Jawaban terkunci.</strong> Tekan <strong>Kumpulkan</strong> sebelum {formatSisa(Date.parse(waktu.batasKumpul) - now)}. Setelah itu sistem mengumpulkan otomatis.
        </Pita>
      )}
      {status === 'offline' && (
        <Pita warna="bg-slate-800 text-white" ikon={<CloudOff className="h-4 w-4" />}>
          Koneksi terputus. Jawaban disimpan sementara di perangkat dan akan dikirim otomatis saat tersambung.
        </Pita>
      )}
      {bukanLayarPenuh && (
        <div className="bg-navy-light px-3 py-2 text-center text-sm text-navy">
          <button className="font-semibold underline underline-offset-2" onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}>
            <Maximize className="mr-1 inline h-4 w-4" /> Kembali ke layar penuh
          </button>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_300px]">
        <section className="kartu relative overflow-hidden">
          <Watermark nama={p.identitas.nama} nis={p.identitas.nis} />
          <div className={`relative p-4 transition-[filter] duration-150 sm:p-6 ${fokus ? '' : 'blur-xl'}`}>
            <TampilanSoal soal={soal} isi={jawaban[soal.id]?.isi ?? null} onUbah={(isi, segera) => ubah(soal, isi, segera)} terkunci={!bisaUbah} />
          </div>
          <div className="relative z-20 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:p-4">
            <button className="btn-garis" onClick={() => pindah(idx - 1)} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Sebelumnya</span>
            </button>
            <button
              className={`btn border-2 ${jawaban[soal.id]?.ragu ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-amber-300 bg-white text-amber-800'}`}
              onClick={toggleRagu}
              aria-pressed={!!jawaban[soal.id]?.ragu}
            >
              <Flag className="h-4 w-4" /> Ragu-ragu
            </button>
            {idx < p.soal.length - 1 ? (
              <button className="btn-primer" onClick={() => pindah(idx + 1)}>
                <span className="hidden sm:inline">Berikutnya</span> <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-emas" onClick={() => setKonfirmasiKumpul(true)} disabled={fase === 'DITUTUP'}>
                <Send className="h-4 w-4" /> Kumpulkan
              </button>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="kartu sticky top-[92px] p-4">
            <PanelNomor soal={p.soal} jawaban={jawaban} aktif={idx} onPilih={pindah} />
            <button className="btn-emas mt-4 w-full" onClick={() => setKonfirmasiKumpul(true)} disabled={fase === 'DITUTUP'}>
              <Send className="h-4 w-4" /> Kumpulkan
            </button>
          </div>
        </aside>
      </main>

      {panelBuka && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 lg:hidden" onClick={() => setPanelBuka(false)}>
          <div className="w-full rounded-t-2xl bg-white p-4 pb-6" onClick={(e) => e.stopPropagation()} data-masuk>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Daftar soal</h3>
              <button className="btn btn-kecil" onClick={() => setPanelBuka(false)} aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>
            <PanelNomor soal={p.soal} jawaban={jawaban} aktif={idx} onPilih={pindah} />
            <button
              className="btn-emas mt-4 w-full"
              onClick={() => {
                setPanelBuka(false);
                setKonfirmasiKumpul(true);
              }}
              disabled={fase === 'DITUTUP'}
            >
              <Send className="h-4 w-4" /> Kumpulkan
            </button>
          </div>
        </div>
      )}

      {konfirmasiKumpul && (
        <Modal label="Konfirmasi kumpul" onTutup={() => !mengumpulkan && setKonfirmasiKumpul(false)}>
          <h3 className="text-lg font-bold">Kumpulkan jawaban?</h3>
          <p className="mt-1 text-sm text-slate-600">Setelah dikumpulkan, jawaban tidak dapat diubah lagi.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 ${belum ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
              <div className="angka font-heading text-2xl font-bold">{belum}</div>
              <div className="text-xs">soal belum dijawab</div>
            </div>
            <div className={`rounded-xl p-3 ${ragu ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
              <div className="angka font-heading text-2xl font-bold">{ragu}</div>
              <div className="text-xs">soal ditandai ragu</div>
            </div>
          </div>
          {galatKumpul && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galatKumpul}</p>}
          <div className="mt-5 flex gap-2">
            <button className="btn-garis flex-1" onClick={() => setKonfirmasiKumpul(false)} disabled={mengumpulkan}>
              Kembali
            </button>
            <button className="btn-emas flex-1" onClick={kumpulkan} disabled={mengumpulkan}>
              {mengumpulkan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ya, kumpulkan
            </button>
          </div>
        </Modal>
      )}

      {peringatan != null && peringatan < 3 && (
        <Modal label="Peringatan">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Peringatan ke-{peringatan}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Anda terdeteksi meninggalkan halaman ujian. Kejadian ini <strong>dicatat</strong> beserta waktu dan lamanya.
                {peringatan === 2 ? ' Pelanggaran berikutnya akan membunyikan sirine dan ditandai di layar pengawas.' : ' Tetap di halaman ini sampai ujian selesai.'}
              </p>
            </div>
          </div>
          <button className="btn-primer mt-5 w-full" onClick={() => setPeringatan(null)}>
            Saya mengerti
          </button>
        </Modal>
      )}

      {peringatan != null && peringatan >= 3 && (
        <div className="kedip-merah fixed inset-0 z-[80] flex items-center justify-center p-4 text-white" role="alertdialog" aria-label="Pelanggaran">
          <div className="max-w-md text-center">
            <ShieldAlert className="mx-auto h-16 w-16" />
            <h3 className="mt-3 font-heading text-3xl font-bold">PELANGGARAN KE-{peringatan}</h3>
            <p className="mt-3 text-base leading-relaxed text-rose-50">
              Anda kembali meninggalkan halaman ujian. Sirine dibunyikan, kejadian dicatat, dan nama Anda ditandai merah di layar pengawas. Ujian tetap dapat dilanjutkan.
            </p>
            <button className="btn mt-6 w-full bg-white text-rose-700 hover:bg-rose-50" onClick={() => setPeringatan(null)}>
              Lanjutkan ujian
            </button>
          </div>
        </div>
      )}

      {tutupLayar && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black p-6 text-center text-white">
          <div>
            <ShieldAlert className="mx-auto h-12 w-12 text-emas" />
            <p className="mt-3 font-heading text-xl font-bold">Tangkapan layar tidak diizinkan</p>
            <p className="mt-1 text-sm text-slate-300">Kejadian ini telah dicatat.</p>
          </div>
        </div>
      )}

      {fase === 'DITUTUP' && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/80 p-6 text-center text-white">
          <div>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-emas" />
            <p className="mt-3 font-heading text-xl font-bold">Waktu ujian telah berakhir</p>
            <p className="mt-1 text-sm text-slate-300">Sistem sedang mengumpulkan jawaban Anda secara otomatis…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Pita({ children, warna, ikon }: { children: React.ReactNode; warna: string; ikon: React.ReactNode }) {
  return (
    <div className={`${warna} px-3 py-2 text-sm`}>
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <span className="mt-0.5">{ikon}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

function IndikatorSimpan({ status }: { status: StatusSimpan }) {
  if (status === 'menyimpan')
    return (
      <span className="flex items-center gap-1 font-medium text-slate-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
      </span>
    );
  if (status === 'offline')
    return (
      <span className="flex items-center gap-1 font-semibold text-rose-600">
        <CloudOff className="h-3.5 w-3.5" /> Offline
      </span>
    );
  if (status === 'terkunci')
    return (
      <span className="flex items-center gap-1 font-semibold text-rose-600">
        <Lock className="h-3.5 w-3.5" /> Terkunci
      </span>
    );
  return (
    <span className="flex items-center gap-1 font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan
    </span>
  );
}

export function PanelNomor({
  soal,
  jawaban,
  aktif,
  onPilih,
}: {
  soal: SoalSiswa[];
  jawaban: Record<string, JawabanSiswa>;
  aktif: number;
  onPilih: (i: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {soal.map((s, i) => {
          const j = jawaban[s.id];
          const sudah = terjawab(s, j);
          const cls = j?.ragu
            ? 'bg-amber-400 border-amber-500 text-slate-900'
            : sudah
              ? 'bg-navy border-navy text-white'
              : 'bg-white border-slate-300 text-slate-700';
          return (
            <button
              key={s.id}
              onClick={() => onPilih(i)}
              className={`angka flex h-11 items-center justify-center rounded-lg border-2 font-heading text-sm font-bold ${cls} ${i === aktif ? 'ring-2 ring-emas ring-offset-2' : ''}`}
              aria-label={`Soal ${s.nomor}${sudah ? ', sudah dijawab' : ', belum dijawab'}${j?.ragu ? ', ragu-ragu' : ''}`}
            >
              {s.nomor}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <i className="h-3 w-3 rounded border-2 border-slate-300 bg-white" /> Belum
        </span>
        <span className="flex items-center gap-1">
          <i className="h-3 w-3 rounded bg-navy" /> Dijawab
        </span>
        <span className="flex items-center gap-1">
          <i className="h-3 w-3 rounded bg-amber-400" /> Ragu
        </span>
      </div>
    </div>
  );
}
