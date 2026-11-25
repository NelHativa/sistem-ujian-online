const TZ = 'Asia/Jakarta';

export function jam(d: Date | string | null | undefined, detik = false) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(detik ? { second: '2-digit' } : {}),
    hour12: false,
  })
    .format(new Date(d))
    .replace(/\./g, ':');
}

export function tanggal(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d));
}

export function tanggalPendek(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(d),
  );
}

export function tanggalJam(d: Date | string | null | undefined) {
  if (!d) return '—';
  return `${tanggalPendek(d)} ${jam(d)}`;
}

/** Tanggal ISO (YYYY-MM-DD) di zona WIB. */
export function isoTanggalWIB(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export function durasi(detik: number) {
  const s = Math.max(0, Math.round(detik));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const LABEL_KEHADIRAN: Record<string, string> = {
  BELUM: 'Belum masuk',
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  TIDAK_HADIR: 'Tidak hadir',
};

export const LABEL_CARA_KUMPUL: Record<string, string> = {
  MANUAL: 'Manual',
  OTOMATIS: 'Otomatis',
  PAKSA_ADMIN: 'Dipaksa admin',
};

export const LABEL_TIPE_SOAL: Record<string, string> = {
  PG: 'Pilihan ganda',
  PGK: 'Pilihan ganda kompleks',
  BS: 'Benar/Salah',
  ESAI: 'Esai',
};

export const LABEL_JENIS_UJIAN: Record<string, string> = {
  PTS: 'PTS',
  PAS: 'PAS',
  PAT: 'PAT',
  US: 'Ujian Sekolah',
};
