import { ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { JudulHalaman } from '@/components/StafShell';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jam, tanggal } from '@/lib/format';

export default async function DaftarKoreksi() {
  const { guru } = await wajibGuru();
  const pasangan = guru.penugasan.map((p) => ({ mapelId: p.mapelId, kelasId: p.kelasId }));
  const sesi = await prisma.sesiUjian.findMany({
    where: { tipe: 'REGULER', paket: { mapelId: { in: pasangan.map((p) => p.mapelId) } } },
    include: { paket: { include: { mapel: true } }, kelas: { include: { kelas: true } } },
    orderBy: { mulai: 'desc' },
  });
  const item = [];
  for (const s of sesi) {
    for (const k of s.kelas) {
      if (!pasangan.some((p) => p.mapelId === s.paket.mapelId && p.kelasId === k.kelasId)) continue;
      const peserta = await prisma.pesertaSesi.findMany({
        where: { siswa: { kelasId: k.kelasId }, sesi: { OR: [{ id: s.id }, { sesiIndukId: s.id }] } },
        include: { nilai: true },
      });
      const unik = new Set(peserta.map((p) => p.siswaId));
      const dinilai = new Set(peserta.filter((p) => p.nilai?.nilaiAkhir != null).map((p) => p.siswaId));
      item.push({ s, kelas: k.kelas, total: unik.size, dinilai: dinilai.size });
    }
  }
  return (
    <>
      <JudulHalaman judul="Koreksi & nilai" sub="Pilih kelas untuk mengoreksi jawaban, mengisi Nilai Akhir, dan mengekspor rekap Excel. Koreksi dibuka setelah sesi ditutup." />
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Mapel</th>
              <th>Kelas</th>
              <th>Status sesi</th>
              <th>Status koreksi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {item.map(({ s, kelas, total, dinilai }) => (
              <tr key={`${s.id}-${kelas.id}`} className="hover:bg-slate-50">
                <td className="whitespace-nowrap text-sm">
                  {tanggal(s.mulai)}
                  <div className="angka text-xs text-slate-500">
                    {jam(s.mulai)}–{jam(s.selesai)}
                  </div>
                </td>
                <td className="font-semibold">
                  {s.paket.mapel.nama} <span className="text-xs font-normal text-slate-500">{s.paket.jenisUjian}</span>
                </td>
                <td>{kelas.nama}</td>
                <td>{s.ditutupAt ? <span className="lencana bg-slate-200 text-slate-700">Ditutup</span> : <span className="lencana bg-blue-100 text-navy">Belum ditutup</span>}</td>
                <td>
                  <span className={`lencana ${dinilai === total ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                    {dinilai}/{total} dinilai
                  </span>
                </td>
                <td className="text-right">
                  {s.ditutupAt ? (
                    <Link href={`/guru/koreksi/${s.id}?kelas=${kelas.id}`} className="btn-primer btn-kecil">
                      Koreksi <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Lock className="h-3.5 w-3.5" /> setelah ditutup
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
