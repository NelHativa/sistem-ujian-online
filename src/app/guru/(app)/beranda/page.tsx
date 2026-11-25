import { BookOpen, ChevronRight, ClipboardCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import { JudulHalaman, LencanaStatusPaket } from '@/components/StafShell';
import { BuatPaket } from '@/components/guru/BuatPaket';
import { wajibGuru } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LABEL_JENIS_UJIAN, tanggalJam } from '@/lib/format';

export default async function BerandaGuru() {
  const { guru } = await wajibGuru();
  const paket = await prisma.paketSoal.findMany({
    where: { guruId: guru.id },
    include: { mapel: true, soal: { select: { bobot: true } }, sesi: { select: { mulai: true } } },
    orderBy: { id: 'asc' },
  });
  const tugas = new Map<string, { mapel: string; mapelId: number; kelas: string[]; tingkat: Set<string> }>();
  for (const p of guru.penugasan) {
    const t = tugas.get(p.mapel.nama) ?? { mapel: p.mapel.nama, mapelId: p.mapelId, kelas: [], tingkat: new Set() };
    t.kelas.push(p.kelas.nama);
    t.tingkat.add(p.kelas.tingkat);
    tugas.set(p.mapel.nama, t);
  }
  const opsiBuat = [...tugas.values()].flatMap((t) => [...t.tingkat].map((tk) => ({ mapelId: t.mapelId, mapel: t.mapel, tingkat: tk })));

  return (
    <>
      <JudulHalaman judul={`Selamat datang, ${guru.nama.split(',')[0]}`} sub="Susun paket soal, pastikan tampilannya benar, lalu finalkan. Jadwal dan token diurus admin." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="kartu p-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <BookOpen className="h-4 w-4 text-navy" /> Penugasan mengajar
          </h2>
          <ul className="mt-3 space-y-3">
            {[...tugas.values()].map((t) => (
              <li key={t.mapel} className="rounded-xl bg-slate-50 p-3">
                <div className="font-semibold">{t.mapel}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.kelas.map((k) => (
                    <span key={k} className="lencana bg-white text-slate-600 ring-1 ring-slate-200">
                      {k}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/guru/koreksi" className="btn-garis mt-4 w-full">
            <ClipboardCheck className="h-4 w-4" /> Koreksi & nilai
          </Link>
        </section>

        <section className="kartu overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FileText className="h-4 w-4 text-navy" /> Paket soal saya
            </h2>
            <BuatPaket opsi={opsiBuat} />
          </div>
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Jenis</th>
                  <th>Soal</th>
                  <th>Total bobot</th>
                  <th>Status</th>
                  <th>Sesi terjadwal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paket.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td>
                      <div className="font-semibold">{p.judul}</div>
                      <div className="text-xs text-slate-500">
                        {p.mapel.nama} · Kelas {p.tingkat}
                      </div>
                    </td>
                    <td>{LABEL_JENIS_UJIAN[p.jenisUjian] ?? p.jenisUjian}</td>
                    <td className="angka">{p.soal.length}</td>
                    <td className="angka">{p.soal.reduce((a, s) => a + s.bobot, 0)}</td>
                    <td>
                      <LencanaStatusPaket status={p.status} />
                    </td>
                    <td className="text-xs text-slate-600">{p.sesi.length ? p.sesi.map((s) => tanggalJam(s.mulai)).join(', ') : '—'}</td>
                    <td className="text-right">
                      <Link href={`/guru/paket/${p.id}`} className="btn-garis btn-kecil">
                        Buka <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!paket.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Belum ada paket soal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
