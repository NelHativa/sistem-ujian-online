import { AlertTriangle, Clock, Edit3, LogOut, Siren } from 'lucide-react';
import { prisma } from '@/lib/db';
import { durasi, jam, LABEL_KEHADIRAN, LABEL_CARA_KUMPUL, tanggalPendek } from '@/lib/format';
import { KODE_PELANGGARAN, LABEL_LOG } from '@/lib/log';

const WARNA: Record<string, string> = {
  KELUAR_TAB: 'bg-rose-500',
  SIRINE_DIBUNYIKAN: 'bg-rose-700',
  PRINTSCREEN_TERDETEKSI: 'bg-rose-500',
  KELUAR_LAYAR_PENUH: 'bg-amber-500',
  KEMBALI_TAB: 'bg-amber-400',
  TOKEN_SALAH: 'bg-amber-500',
  LOGIN_DITOLAK_SESI_AKTIF: 'bg-amber-500',
  JAWABAN_DITOLAK_WAKTU: 'bg-amber-500',
  KONEKSI_PUTUS: 'bg-slate-500',
  KONEKSI_TERSAMBUNG: 'bg-slate-400',
  JAWABAN_DISIMPAN: 'bg-navy',
  MASUK_UJIAN: 'bg-emerald-600',
  KUMPUL_MANUAL: 'bg-emerald-600',
  KUMPUL_OTOMATIS: 'bg-emerald-600',
  KUMPUL_PAKSA_ADMIN: 'bg-emerald-600',
};

function rincian(kode: string, data: Record<string, unknown>) {
  const b: string[] = [];
  if (data.nomor != null) b.push(`Soal ${data.nomor}`);
  if (kode === 'JAWABAN_DISIMPAN' && data.isi !== undefined) {
    const isi = data.isi;
    b.push(typeof isi === 'string' ? `“${isi.length > 60 ? isi.slice(0, 60) + '…' : isi}”` : Array.isArray(isi) ? `opsi #${isi.join(', #')}` : isi == null ? 'dikosongkan' : `opsi #${isi}`);
  }
  if (data.urutan != null) b.push(`pelanggaran ke-${data.urutan}`);
  if (data.durasiDetik != null) b.push(`durasi ${durasi(Number(data.durasiDetik))}`);
  if (data.lamaTerputusDetik != null) b.push(`terputus ${durasi(Number(data.lamaTerputusDetik))}`);
  if (data.tombol) b.push(String(data.tombol));
  if (data.token) b.push(`token dimasukkan: ${data.token}`);
  if (data.kehadiran) b.push(LABEL_KEHADIRAN[String(data.kehadiran)] ?? String(data.kehadiran));
  if (data.admin) b.push(`oleh ${data.admin}`);
  if (kode === 'NILAI_DIUBAH') b.push(`${data.lama ?? '—'} → ${data.baru ?? '—'} oleh ${data.guru}`);
  if (data.alasan) b.push(String(data.alasan));
  if (data.jenis) b.push(String(data.jenis));
  return b.join(' · ');
}

/** LOG-05: lini masa per siswa + ringkasan. Hanya-baca (LOG-04). */
export async function LogTimeline({ pesertaId }: { pesertaId: number }) {
  const p = await prisma.pesertaSesi.findUniqueOrThrow({
    where: { id: pesertaId },
    include: { siswa: { include: { kelas: true } }, sesi: { include: { paket: { include: { mapel: true } } } } },
  });
  // Log login siswa di hari ujian juga relevan (login ditolak, dsb.)
  const awal = new Date(p.sesi.mulai.getTime() - 3 * 3600_000);
  const akhir = new Date(p.sesi.selesai.getTime() + 3 * 3600_000);
  const logs = await prisma.logAktivitas.findMany({
    where: {
      OR: [
        { pesertaId },
        { aktorTipe: 'SISWA', aktorId: String(p.siswaId), pesertaId: null, waktu: { gte: awal, lte: akhir } },
      ],
    },
    orderBy: [{ waktu: 'asc' }, { id: 'asc' }],
  });
  const ubahJawaban = logs.filter((l) => l.kode === 'JAWABAN_DISIMPAN').length;
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-3">
        <div className="kartu p-4">
          <h2 className="text-lg font-bold">{p.siswa.nama}</h2>
          <p className="text-sm text-slate-600">
            {p.siswa.kelas.nama} · No. {p.siswa.noUrut} · NIS <span className="font-mono">{p.siswa.nis}</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {p.sesi.paket.mapel.nama} ({p.sesi.paket.jenisUjian}
            {p.sesi.tipe === 'SUSULAN' ? ', susulan' : ''}) · {tanggalPendek(p.sesi.mulai)} {jam(p.sesi.mulai)}–{jam(p.sesi.selesai)}
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Kehadiran</dt>
              <dd className="font-semibold">{LABEL_KEHADIRAN[p.kehadiran]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Jam masuk</dt>
              <dd className="angka">{jam(p.jamMasuk, true)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Jam kumpul</dt>
              <dd className="angka">
                {jam(p.jamKumpul, true)} {p.caraKumpul && `(${LABEL_CARA_KUMPUL[p.caraKumpul]})`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Perangkat</dt>
              <dd className="text-right text-xs">{p.perangkat ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`kartu p-3 ${p.pelanggaran >= 3 ? 'border-rose-300 bg-rose-50' : ''}`}>
            <AlertTriangle className={`h-4 w-4 ${p.pelanggaran >= 3 ? 'text-rose-600' : 'text-amber-600'}`} />
            <div className="angka mt-1 font-heading text-2xl font-bold">{p.pelanggaran}</div>
            <div className="text-xs text-slate-500">pelanggaran</div>
          </div>
          <div className="kartu p-3">
            <LogOut className="h-4 w-4 text-slate-500" />
            <div className="angka mt-1 font-heading text-2xl font-bold">{durasi(p.durasiKeluarDetik)}</div>
            <div className="text-xs text-slate-500">total durasi keluar</div>
          </div>
          <div className="kartu p-3">
            <Edit3 className="h-4 w-4 text-navy" />
            <div className="angka mt-1 font-heading text-2xl font-bold">{ubahJawaban}</div>
            <div className="text-xs text-slate-500">perubahan jawaban</div>
          </div>
          <div className="kartu p-3">
            <Siren className="h-4 w-4 text-rose-600" />
            <div className="mt-1 font-heading text-2xl font-bold">{p.sirine ? 'Ya' : 'Tidak'}</div>
            <div className="text-xs text-slate-500">sirine dibunyikan</div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Log dicatat dengan jam server dan tidak dapat diubah atau dihapus melalui aplikasi.</p>
      </aside>
      <section className="kartu p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <Clock className="h-4 w-4 text-navy" /> Lini masa ({logs.length} catatan)
        </h3>
        <ol className="relative border-l-2 border-slate-200 pl-5">
          {logs.map((l) => {
            const data = JSON.parse(l.data) as Record<string, unknown>;
            const langgar = KODE_PELANGGARAN.has(l.kode);
            return (
              <li key={l.id} className="relative pb-3">
                <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${WARNA[l.kode] ?? 'bg-slate-300'}`} />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="angka font-mono text-xs text-slate-500">{jam(l.waktu, true)}</span>
                  <span className={`text-sm font-semibold ${langgar ? 'text-rose-700' : 'text-slate-900'}`}>{LABEL_LOG[l.kode] ?? l.kode}</span>
                  {l.aktorTipe !== 'SISWA' && <span className="lencana bg-slate-100 text-slate-600">{({ SISTEM: 'Sistem', ADMIN: 'Admin', GURU: 'Guru', ANONIM: 'Anonim' } as Record<string, string>)[l.aktorTipe]}</span>}
                </div>
                <div className="text-xs text-slate-600">
                  {rincian(l.kode, data)}
                  {(l.ip || l.perangkat) && (
                    <span className="text-slate-400">
                      {' '}
                      · {l.ip ?? ''} {l.perangkat ? `· ${l.perangkat}` : ''}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
