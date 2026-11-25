import { ArrowLeft, Download, FileClock, Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JudulHalaman } from '@/components/StafShell';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jam, LABEL_CARA_KUMPUL, LABEL_KEHADIRAN, tanggal } from '@/lib/format';
import { rekapKelas } from '@/lib/rekap';

export default async function PesertaKelas({ params, searchParams }: { params: Promise<{ sesiId: string }>; searchParams: Promise<{ kelas?: string }> }) {
  const { guru } = await wajibGuru();
  const sesiId = Number((await params).sesiId);
  const kelasId = Number((await searchParams).kelas);
  const sesi = await prisma.sesiUjian.findUnique({ where: { id: sesiId }, include: { paket: true } });
  if (!sesi || !sesi.ditutupAt || !guru.penugasan.some((p) => p.kelasId === kelasId && p.mapelId === sesi.paket.mapelId)) notFound();
  const r = await rekapKelas(sesiId, kelasId);
  const warna: Record<string, string> = { HADIR: 'text-emerald-700', TERLAMBAT: 'text-amber-700', TIDAK_HADIR: 'text-rose-700', BELUM: 'text-slate-500' };
  return (
    <>
      <Link href="/guru/koreksi" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Daftar koreksi
      </Link>
      <JudulHalaman
        judul={`${r.sesi.paket.mapel.nama} · ${r.kelas.nama}`}
        sub={`${r.sesi.paket.jenisUjian} · ${tanggal(r.sesi.mulai)} · Nilai Akhir adalah nilai resmi; Nilai Saran hanya referensi.`}
        aksi={
          <a href={`/api/rekap?sesiId=${sesiId}&kelasId=${kelasId}`} className="btn-emas">
            <Download className="h-4 w-4" /> Ekspor Excel
          </a>
        }
      />
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Kehadiran</th>
              <th>Kumpul</th>
              <th>Dijawab</th>
              <th>Skor objektif</th>
              <th>Nilai saran</th>
              <th>Nilai akhir</th>
              <th>Pelanggaran</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {r.baris.map((b) => (
              <tr key={b.pesertaId} className="hover:bg-slate-50">
                <td className="angka text-slate-500">{b.siswa.noUrut}</td>
                <td>
                  <div className="font-semibold">{b.siswa.nama}</div>
                  {b.tipeSesi === 'SUSULAN' && <span className="lencana bg-violet-100 text-violet-700">Susulan</span>}
                </td>
                <td className={`text-sm font-medium ${warna[b.kehadiran]}`}>
                  {LABEL_KEHADIRAN[b.kehadiran]}
                  {b.jamMasuk && <div className="angka text-xs font-normal text-slate-500">{jam(b.jamMasuk)}</div>}
                </td>
                <td className="text-sm">
                  {b.jamKumpul ? (
                    <>
                      <span className="angka">{jam(b.jamKumpul)}</span>
                      <div className="text-xs text-slate-500">{LABEL_CARA_KUMPUL[b.caraKumpul ?? '']}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="angka">{b.jamMasuk ? `${b.dijawab}/${b.totalSoal}` : '—'}</td>
                <td className="angka">{b.jamMasuk ? `${b.skorObjektif}/${b.totalObjektif}` : '—'}</td>
                <td className="angka font-semibold text-slate-600">{b.nilaiSaran ?? '—'}</td>
                <td>
                  {b.nilaiAkhir != null ? (
                    <span className="angka inline-flex h-8 min-w-[40px] items-center justify-center rounded-lg bg-navy px-2 font-heading font-bold text-white">{b.nilaiAkhir}</span>
                  ) : b.jamMasuk ? (
                    <span className="lencana bg-amber-100 text-amber-800">Belum</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`angka font-bold ${b.pelanggaran >= 3 ? 'text-rose-600' : b.pelanggaran ? 'text-amber-700' : 'text-slate-400'}`}>{b.pelanggaran}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {b.jamMasuk && (
                      <Link href={`/guru/koreksi/${b.sesiId}/${b.pesertaId}?kelas=${kelasId}&dari=${sesiId}`} className="btn-primer btn-kecil">
                        <Pencil className="h-3.5 w-3.5" /> Koreksi
                      </Link>
                    )}
                    <Link href={`/guru/log/${b.pesertaId}`} className="btn-garis btn-kecil">
                      <FileClock className="h-3.5 w-3.5" /> Log
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
