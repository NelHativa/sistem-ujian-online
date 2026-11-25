import { CalendarClock, CheckCircle2, ChevronRight, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { TombolGantiPassword } from '@/components/GantiPassword';
import { HitungMundur } from '@/components/HitungMundur';
import { Lambang } from '@/components/Logo';
import { TombolKeluar } from '@/components/TombolKeluar';
import { wajibSiswa } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isoTanggalWIB, jam, tanggal } from '@/lib/format';
import { getPengaturan } from '@/lib/settings';
import { faseSesi } from '@/lib/waktu';

export const dynamic = 'force-dynamic';

export default async function BerandaSiswa() {
  const { siswa } = await wajibSiswa();
  const t = await getPengaturan();
  const now = new Date();
  const hariIni = isoTanggalWIB(now);
  const semua = await prisma.pesertaSesi.findMany({
    where: { siswaId: siswa.id },
    include: { sesi: { include: { paket: { include: { mapel: true } } } } },
    orderBy: { sesi: { mulai: 'asc' } },
  });
  const ujian = semua.filter((p) => isoTanggalWIB(p.sesi.mulai) === hariIni);

  return (
    <div className="min-h-dvh">
      <header className="bg-gradient-to-b from-navy to-navy-dark text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Lambang className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-heading text-sm font-bold">Ujian SMAS Bina Taruna</div>
              <div className="text-xs text-emas">
                {t.tahunAjaran} · Semester {t.semester}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {t.gantiPasswordAktif && <TombolGantiPassword peran="SISWA" terang />}
            <TombolKeluar peran="SISWA" terang />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-2">
          <p className="text-sm text-blue-200">Selamat datang,</p>
          <h1 className="text-2xl font-bold">{siswa.nama}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="lencana bg-white/10 text-white">Kelas {siswa.kelas.nama}</span>
            <span className="lencana bg-white/10 text-white">No. Urut {siswa.noUrut}</span>
            <span className="lencana bg-white/10 font-mono text-white">{siswa.nisn ? `NISN ${siswa.nisn}` : `NIS ${siswa.nis}`}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6" data-masuk>
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Ujian hari ini</h2>
          <span className="text-sm text-slate-500">{tanggal(now)}</span>
        </div>
        {ujian.length === 0 && (
          <div className="kartu p-8 text-center text-slate-500">
            <CalendarClock className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            Tidak ada ujian yang dijadwalkan untuk Anda hari ini.
          </div>
        )}
        <ul className="space-y-3">
          {ujian.map((p) => {
            const fase = faseSesi(p.sesi, t, now);
            const sudah = !!p.jamKumpul;
            const bisaMasuk = !sudah && (fase === 'BERLANGSUNG' || (!!p.jamMasuk && fase !== 'BELUM_MULAI' && fase !== 'DITUTUP'));
            return (
              <li key={p.id} className="kartu overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{p.sesi.paket.mapel.nama}</h3>
                      <span className="lencana bg-slate-100 text-slate-600">{p.sesi.paket.jenisUjian}</span>
                      {p.sesi.tipe === 'SUSULAN' && <span className="lencana bg-violet-100 text-violet-700">Susulan</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <Clock className="h-4 w-4" /> {jam(p.sesi.mulai)} – {jam(p.sesi.selesai)} WIB
                    </p>
                  </div>
                  <div className="sm:text-right">
                    {sudah ? (
                      <span className="lencana bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sudah dikumpulkan {jam(p.jamKumpul)}
                      </span>
                    ) : fase === 'BELUM_MULAI' ? (
                      <div>
                        <span className="lencana bg-amber-100 text-amber-800">Belum dimulai</span>
                        <div className="mt-1 text-sm text-slate-600">
                          Dimulai dalam{' '}
                          <strong className="text-slate-900">
                            <HitungMundur target={p.sesi.mulai.toISOString()} serverNow={now.toISOString()} />
                          </strong>
                        </div>
                      </div>
                    ) : bisaMasuk ? (
                      <span className="lencana bg-blue-100 text-navy">Berlangsung</span>
                    ) : (
                      <span className="lencana bg-slate-200 text-slate-600">Selesai</span>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  {bisaMasuk ? (
                    <Link href={`/ujian/${p.sesi.id}`} className="btn-primer w-full sm:w-auto">
                      {p.jamMasuk ? 'Lanjutkan ujian' : 'Masuk ujian'} <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button className="btn-primer w-full sm:w-auto" disabled>
                      <Lock className="h-4 w-4" /> {sudah ? 'Jawaban telah terkirim' : fase === 'BELUM_MULAI' ? 'Masuk ujian' : 'Ujian telah ditutup'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center text-xs text-slate-500">Waktu mengikuti jam server sekolah, bukan jam di perangkat Anda.</p>
      </main>
    </div>
  );
}
