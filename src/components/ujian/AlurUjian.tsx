'use client';

import { ArrowLeft, Calculator, CheckCircle2, Clock, KeyRound, Loader2, Lock, Play, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Captcha, CaptchaHandle } from '@/components/Captcha';
import { Lambang } from '@/components/Logo';
import { formatSisa, jamServerSekarang, sinkronJam } from '@/lib/jamServer';
import { bukaIzinSuara } from '@/lib/sirine';
import { Identitas, LayarUjian } from './LayarUjian';
import { INSTRUKSI_HITUNGAN, JawabanSiswa, SoalSiswa } from './tipe';

type Data = {
  serverNow: string;
  fase: string;
  langkah: 'BELUM_MULAI' | 'TOKEN' | 'KONFIRMASI' | 'KERJAKAN' | 'SELESAI' | 'TERTUTUP' | 'BELUM_FINAL';
  waktu: { mulai: string; selesai: string; batasEdit: string; batasKumpul: string };
  identitas: Identitas;
  pesertaId: number;
  jamKumpul: string | null;
  pelanggaran: number;
  jumlahSoal?: number;
  adaHitungan: boolean;
  toleransi: { edit: number; kumpul: number };
  soal?: SoalSiswa[];
  jawaban?: Record<string, JawabanSiswa>;
};

const fmtJam = (iso: string, detik = false) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', ...(detik ? { second: '2-digit' } : {}), hour12: false })
    .format(new Date(iso))
    .replace(/\./g, ':');

export function AlurUjian({ sesiId }: { sesiId: number }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [loginHabis, setLoginHabis] = useState(false);

  const muat = useCallback(async () => {
    try {
      const t0 = performance.now();
      const r = await fetch(`/api/ujian/${sesiId}`, { cache: 'no-store' });
      const j = await r.json();
      if (r.status === 401) return setLoginHabis(true);
      if (!r.ok) return setGalat(j.pesan ?? 'Gagal memuat ujian.');
      sinkronJam(j.serverNow, performance.now() - t0);
      setGalat(null);
      setData(j);
    } catch {
      setGalat('Tidak dapat terhubung ke server. Periksa koneksi lalu muat ulang halaman.');
    }
  }, [sesiId]);

  useEffect(() => {
    muat();
  }, [muat]);

  if (loginHabis) return <LoginBerakhir />;
  if (galat && !data)
    return (
      <Bingkai>
        <p className="text-rose-700">{galat}</p>
        <button className="btn-primer mt-4" onClick={muat}>
          Coba lagi
        </button>
      </Bingkai>
    );
  if (!data)
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat ujian…
      </div>
    );

  switch (data.langkah) {
    case 'BELUM_MULAI':
      return <BelumMulai data={data} onMulai={muat} />;
    case 'TOKEN':
      return <MasukkanToken data={data} sesiId={sesiId} onBerhasil={muat} />;
    case 'KONFIRMASI':
      return <Konfirmasi data={data} sesiId={sesiId} onMulai={muat} />;
    case 'KERJAKAN':
      return (
        <LayarUjian
          sesiId={sesiId}
          pesertaId={data.pesertaId}
          identitas={data.identitas}
          waktuAwal={data.waktu}
          soal={data.soal ?? []}
          jawabanAwal={data.jawaban ?? {}}
          pelanggaranAwal={data.pelanggaran}
          onSelesai={(jamKumpul) => {
            try {
              localStorage.removeItem(`ujian-antrean-${data.pesertaId}`);
            } catch {}
            setData({ ...data, langkah: 'SELESAI', jamKumpul });
          }}
          onLoginHabis={() => setLoginHabis(true)}
        />
      );
    case 'SELESAI':
      return (
        <Bingkai>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Jawaban telah terkirim</h1>
            <p className="mt-1 text-slate-600">
              {data.identitas.mapel} · {data.identitas.kelas}
            </p>
            {data.jamKumpul && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                Waktu kumpul: <strong className="angka font-mono text-slate-900">{fmtJam(data.jamKumpul, true)} WIB</strong>
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">Nilai tidak ditampilkan kepada siswa. Terima kasih telah mengerjakan dengan jujur.</p>
            <button className="btn-primer mt-6 w-full" onClick={() => router.push('/ujian')}>
              <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
            </button>
          </div>
        </Bingkai>
      );
    case 'BELUM_FINAL':
      return (
        <Bingkai>
          <Lock className="h-8 w-8 text-amber-600" />
          <h1 className="mt-3 text-xl font-bold">Ujian belum dapat dimulai</h1>
          <p className="mt-1 text-slate-600">Paket soal untuk sesi ini belum siap. Mohon tunggu arahan pengawas.</p>
          <button className="btn-garis mt-5" onClick={muat}>
            Periksa lagi
          </button>
        </Bingkai>
      );
    default:
      return (
        <Bingkai>
          <Lock className="h-8 w-8 text-slate-500" />
          <h1 className="mt-3 text-xl font-bold">Ujian telah ditutup</h1>
          <p className="mt-1 text-slate-600">Waktu ujian sudah berakhir dan ujian ini tidak dapat diakses lagi. Bila Anda belum mengikuti ujian, hubungi admin untuk ujian susulan.</p>
          <Link href="/ujian" className="btn-primer mt-5">
            <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
        </Bingkai>
      );
  }
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="bg-gradient-to-b from-navy to-navy-dark px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <Lambang className="h-8 w-8" />
          <span className="font-heading text-sm font-bold text-white">Ujian SMAS Bina Taruna</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <div className="kartu p-5 sm:p-6" data-masuk>
          {children}
        </div>
      </main>
    </div>
  );
}

function KartuIdentitas({ d }: { d: Data }) {
  const i = d.identitas;
  const baris: [string, string][] = [
    ['Nama', i.nama],
    ['No. Urut', String(i.noUrut)],
    ['Kelas', i.kelas],
    [i.nisn ? 'NISN' : 'NIS', i.nisn ?? i.nis],
    ['Mata pelajaran', `${i.mapel} (${i.jenisUjian}${i.tipeSesi === 'SUSULAN' ? ', Susulan' : ''})`],
    ['Waktu', `${fmtJam(d.waktu.mulai)} – ${fmtJam(d.waktu.selesai)} WIB`],
  ];
  return (
    <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {baris.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-3 py-2.5 text-sm">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-right font-semibold text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function BelumMulai({ data, onMulai }: { data: Data; onMulai: () => void }) {
  const [sisa, setSisa] = useState(() => Date.parse(data.waktu.mulai) - jamServerSekarang());
  useEffect(() => {
    let dipanggil = false;
    const id = setInterval(() => {
      const s = Date.parse(data.waktu.mulai) - jamServerSekarang();
      setSisa(s);
      if (s <= 0 && !dipanggil) {
        dipanggil = true;
        setTimeout(onMulai, 500);
      }
    }, 250);
    return () => clearInterval(id);
  }, [data.waktu.mulai, onMulai]);
  return (
    <Bingkai>
      <span className="lencana bg-amber-100 text-amber-800">Belum dimulai</span>
      <h1 className="mt-2 text-xl font-bold">{data.identitas.mapel}</h1>
      <div className="my-6 rounded-2xl bg-navy p-6 text-center text-white">
        <p className="text-sm text-blue-200">Ujian dimulai dalam</p>
        <p className="angka mt-1 font-mono text-5xl font-bold">{formatSisa(sisa)}</p>
        <p className="mt-2 text-sm text-emas">Pukul {fmtJam(data.waktu.mulai)} WIB</p>
      </div>
      <KartuIdentitas d={data} />
      <button className="btn-primer mt-5 w-full" disabled>
        <Lock className="h-4 w-4" /> Masuk ujian
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Tombol aktif otomatis saat jam mulai (mengikuti jam server).</p>
    </Bingkai>
  );
}

function MasukkanToken({ data, sesiId, onBerhasil }: { data: Data; sesiId: number; onBerhasil: () => void }) {
  const [token, setToken] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const capRef = useRef<CaptchaHandle>(null);
  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/ujian/${sesiId}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, captcha, captchaId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setGalat(j.pesan);
        capRef.current?.muatUlang();
        return;
      }
      onBerhasil();
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally {
      setProses(false);
    }
  }
  return (
    <Bingkai>
      <div className="flex items-center gap-2 text-navy">
        <KeyRound className="h-5 w-5" />
        <span className="font-heading text-sm font-semibold">Masukkan token ujian</span>
      </div>
      <h1 className="mt-1 text-xl font-bold">{data.identitas.mapel}</h1>
      <p className="mt-1 text-sm text-slate-600">Token 6 digit diumumkan oleh pengawas di ruang ujian.</p>
      <form onSubmit={kirim} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="token">
            Token
          </label>
          <input
            id="token"
            className="input text-center font-mono text-2xl tracking-[0.5em]"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••••"
            required
          />
        </div>
        <Captcha ref={capRef} nilai={captcha} onUbah={setCaptcha} onId={setCaptchaId} />
        {galat && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
            {galat}
          </p>
        )}
        <button className="btn-primer w-full" disabled={proses || token.length !== 6 || captcha.length < 5}>
          {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Lanjut
        </button>
        <Link href="/ujian" className="btn-garis w-full">
          Batal
        </Link>
      </form>
    </Bingkai>
  );
}

function Konfirmasi({ data, sesiId, onMulai }: { data: Data; sesiId: number; onMulai: () => void }) {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  async function mulai() {
    setProses(true);
    // Gestur pengguna: buka izin suara (AMAN-10) dan minta layar penuh (AMAN-05).
    bukaIzinSuara();
    const el = document.documentElement;
    if (document.fullscreenEnabled && !/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      el.requestFullscreen?.().catch(() => undefined);
    }
    try {
      const r = await fetch(`/api/ujian/${sesiId}/mulai`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) {
        setGalat(j.pesan);
        return;
      }
      onMulai();
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally {
      setProses(false);
    }
  }
  const aturan = [
    'Waktu mengikuti jam server. Ujian berakhir pada jam selesai yang sama untuk semua peserta, termasuk yang masuk terlambat.',
    'Jawaban tersimpan otomatis setiap kali berubah. Bila koneksi terputus, jawaban disimpan sementara di perangkat.',
    'Seluruh aktivitas selama ujian dicatat, termasuk keluar dari halaman ujian, pindah aplikasi, dan tangkapan layar.',
    'Keluar dari halaman ujian dihitung pelanggaran. Pelanggaran ke-3 dan seterusnya membunyikan sirine dan ditandai di layar pengawas.',
    'Klik kanan, salin, tempel, dan cetak dinonaktifkan. Layar akan dipertahankan tetap menyala.',
    `Setelah jam selesai, Anda punya ${data.toleransi.edit} menit untuk menuntaskan jawaban, lalu jawaban terkunci dan hanya bisa dikumpulkan. Sistem mengumpulkan otomatis ${data.toleransi.kumpul} menit setelah jam selesai.`,
  ];
  return (
    <Bingkai>
      <span className="lencana bg-blue-100 text-navy">
        <ShieldCheck className="h-3.5 w-3.5" /> Token benar
      </span>
      <h1 className="mt-2 text-xl font-bold">Periksa identitas Anda</h1>
      <div className="mt-4">
        <KartuIdentitas d={data} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
        <Clock className="h-4 w-4" /> {data.jumlahSoal} soal · berakhir {fmtJam(data.waktu.selesai)} WIB
      </p>
      <h2 className="mt-5 text-base font-bold">Tata tertib</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {aturan.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ol>
      {data.adaHitungan && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <Calculator className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Ada soal hitungan.</strong> {INSTRUKSI_HITUNGAN} Kertas coretan dikumpulkan kepada pengawas.
          </p>
        </div>
      )}
      {galat && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{galat}</p>}
      <button className="btn-primer mt-5 w-full text-base" onClick={mulai} disabled={proses}>
        {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Mulai mengerjakan
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Menekan Mulai berarti Anda menyetujui tata tertib di atas. Kehadiran tercatat saat halaman soal terbuka.</p>
    </Bingkai>
  );
}

function LoginBerakhir() {
  return (
    <Bingkai>
      <Lock className="h-8 w-8 text-rose-600" />
      <h1 className="mt-3 text-xl font-bold">Sesi login berakhir</h1>
      <p className="mt-1 text-slate-600">
        Sesi login di perangkat ini sudah tidak berlaku (misalnya karena admin mereset login). Jawaban Anda yang sudah tersimpan tetap aman di server.
      </p>
      <Link href="/" className="btn-primer mt-5 w-full">
        Login kembali
      </Link>
    </Bingkai>
  );
}
