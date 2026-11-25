import { prisma } from './db';
import { sesiMasihAktif } from './auth';
import { sudahDijawab, parseIsi } from './penilaian';

export type StatusPeserta = 'BELUM_MASUK' | 'MENGERJAKAN' | 'SUDAH_KUMPUL' | 'TIDAK_HADIR';

export async function dataPantau(sesiId: number) {
  const peserta = await prisma.pesertaSesi.findMany({
    where: { sesiId },
    include: { siswa: { include: { kelas: true } }, jawaban: { select: { isi: true, soal: { select: { tipe: true } } } } },
    orderBy: [{ siswa: { kelasId: 'asc' } }, { siswa: { noUrut: 'asc' } }],
  });
  const totalSoal = await prisma.soal.count({ where: { paket: { sesi: { some: { id: sesiId } } } } });
  const login = await prisma.sesiLogin.findMany({ where: { akunTipe: 'SISWA', akunId: { in: peserta.map((p) => p.siswaId) }, aktif: true } });
  const loginAktif = new Set(login.filter(sesiMasihAktif).map((l) => l.akunId));
  const logs = await prisma.logAktivitas.findMany({
    where: { sesiId, pesertaId: { not: null } },
    orderBy: { id: 'desc' },
    take: 600,
    select: { pesertaId: true, kode: true, waktu: true },
  });
  const terakhir = new Map<number, { kode: string; waktu: Date }>();
  for (const l of logs) if (l.pesertaId && !terakhir.has(l.pesertaId)) terakhir.set(l.pesertaId, l);
  const now = Date.now();

  const baris = peserta.map((p) => {
    const status: StatusPeserta = p.jamKumpul ? 'SUDAH_KUMPUL' : p.jamMasuk ? 'MENGERJAKAN' : p.kehadiran === 'TIDAK_HADIR' ? 'TIDAK_HADIR' : 'BELUM_MASUK';
    const online = status === 'MENGERJAKAN' && !!p.lastSeen && now - p.lastSeen.getTime() < 25_000;
    const t = terakhir.get(p.id);
    return {
      id: p.id,
      siswaId: p.siswaId,
      nama: p.siswa.nama,
      noUrut: p.siswa.noUrut,
      nis: p.siswa.nis,
      kelas: p.siswa.kelas.nama,
      status,
      kehadiran: p.kehadiran,
      jamMasuk: p.jamMasuk?.toISOString() ?? null,
      jamKumpul: p.jamKumpul?.toISOString() ?? null,
      caraKumpul: p.caraKumpul,
      dijawab: p.jawaban.filter((j) => sudahDijawab(j.soal.tipe, parseIsi(j.isi))).length,
      totalSoal,
      pelanggaran: p.pelanggaran,
      sedangKeluar: !!p.sedangKeluarSejak && !p.jamKumpul,
      online,
      loginAktif: loginAktif.has(p.siswaId),
      perangkat: p.perangkat,
      aktivitas: t ? { kode: t.kode, waktu: t.waktu.toISOString() } : null,
    };
  });
  const hitung = (s: StatusPeserta) => baris.filter((b) => b.status === s).length;
  return {
    baris,
    ringkas: {
      terdaftar: baris.length,
      belumMasuk: hitung('BELUM_MASUK'),
      mengerjakan: hitung('MENGERJAKAN'),
      sudahKumpul: hitung('SUDAH_KUMPUL'),
      tidakHadir: hitung('TIDAK_HADIR'),
      online: baris.filter((b) => b.online).length,
      pelanggar: baris.filter((b) => b.pelanggaran >= 3).length,
    },
  };
}
