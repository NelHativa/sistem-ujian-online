import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { JudulHalaman } from '@/components/StafShell';
import { wajibAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isoTanggalWIB, jam, tanggal } from '@/lib/format';
import { getPengaturan } from '@/lib/settings';
import { FaseSesi, LABEL_FASE, faseSesi } from '@/lib/waktu';

const WARNA_FASE: Record<FaseSesi, string> = {
  BELUM_MULAI: 'bg-slate-100 text-slate-700',
  BERLANGSUNG: 'bg-blue-100 text-navy',
  TOLERANSI_EDIT: 'bg-amber-100 text-amber-800',
  TOLERANSI_KUMPUL: 'bg-amber-100 text-amber-800',
  DITUTUP: 'bg-slate-200 text-slate-600',
};

export default async function BerandaAdmin() {
  const { grupIds } = await wajibAdmin();
  const t = await getPengaturan();
  const now = new Date();
  const sesi = await prisma.sesiUjian.findMany({
    where: { kelas: { some: { kelas: { grupId: { in: grupIds } } } } },
    include: {
      kelas: { include: { kelas: true } },
      paket: { include: { mapel: true, guru: true } },
      peserta: { select: { jamMasuk: true, jamKumpul: true, pelanggaran: true, kehadiran: true } },
    },
    orderBy: { mulai: 'asc' },
  });
  const grup = new Map<string, typeof sesi>();
  for (const s of sesi) {
    const k = isoTanggalWIB(s.mulai);
    grup.set(k, [...(grup.get(k) ?? []), s]);
  }
  const hariIni = isoTanggalWIB(now);
  const urutan = [...grup.keys()].sort((a, b) => (a === hariIni ? -1 : b === hariIni ? 1 : a < hariIni && b >= hariIni ? 1 : b < hariIni && a >= hariIni ? -1 : a.localeCompare(b)));

  return (
    <>
      <JudulHalaman
        judul="Jadwal sesi ujian"
        sub={`Toleransi aktif: edit ${t.toleransiEditMenit} menit, kumpul ${t.toleransiKumpulMenit} menit setelah jam selesai.`}
        aksi={
          <Link href="/admin/sesi/baru" className="btn-primer">
            <Plus className="h-4 w-4" /> Buat sesi
          </Link>
        }
      />
      {urutan.map((tgl) => (
        <section key={tgl} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {tanggal(grup.get(tgl)![0].mulai)} {tgl === hariIni && <span className="lencana bg-emas text-slate-900">Hari ini</span>}
          </h2>
          <div className="kartu overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Mapel</th>
                  <th>Kelas</th>
                  <th>Paket soal</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Peserta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grup.get(tgl)!.map((s) => {
                  const fase = faseSesi(s, t, now);
                  const final = s.paket.status === 'FINAL';
                  const kumpul = s.peserta.filter((p) => p.jamKumpul).length;
                  const masuk = s.peserta.filter((p) => p.jamMasuk).length;
                  const merah = s.peserta.filter((p) => p.pelanggaran >= 3).length;
                  return (
                    <tr key={s.id} className={final ? 'hover:bg-slate-50' : 'bg-rose-50'}>
                      <td className="angka whitespace-nowrap font-mono text-sm">
                        {jam(s.mulai)}–{jam(s.selesai)}
                      </td>
                      <td>
                        <div className="font-semibold">{s.paket.mapel.nama}</div>
                        <div className="text-xs text-slate-500">
                          {s.paket.jenisUjian}
                          {s.tipe === 'SUSULAN' && <span className="ml-1 lencana bg-violet-100 text-violet-700">Susulan</span>}
                        </div>
                      </td>
                      <td className="text-sm">{s.kelas.map((k) => k.kelas.nama).join(', ')}</td>
                      <td>
                        {final ? (
                          <span className="lencana bg-emerald-100 text-emerald-700">Final · siap</span>
                        ) : (
                          <span className="lencana bg-rose-600 text-white">
                            <AlertTriangle className="h-3 w-3" /> Draf · belum siap
                          </span>
                        )}
                        <div className="mt-0.5 text-xs text-slate-500">{s.paket.guru.nama}</div>
                      </td>
                      <td className="angka font-mono text-base font-bold tracking-widest text-navy">{s.token}</td>
                      <td>
                        <span className={`lencana ${WARNA_FASE[fase]}`}>{LABEL_FASE[fase]}</span>
                      </td>
                      <td className="angka whitespace-nowrap text-sm">
                        {masuk}/{s.peserta.length} masuk · {kumpul} kumpul
                        {merah > 0 && <div className="text-xs font-semibold text-rose-600">{merah} siswa ≥3 pelanggaran</div>}
                      </td>
                      <td className="text-right">
                        <Link href={`/admin/sesi/${s.id}`} className="btn-garis btn-kecil">
                          {fase === 'DITUTUP' ? 'Hasil' : 'Pantau'} <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!sesi.length && <div className="kartu p-10 text-center text-slate-500">Belum ada sesi untuk grup Anda.</div>}
    </>
  );
}
