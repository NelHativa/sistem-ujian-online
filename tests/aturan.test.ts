import { describe, expect, it } from 'vitest';
import { acakDeterministik } from '../src/lib/acak';
import { validasiPasswordBaru } from '../src/lib/password';
import { cekBenar, hitungNilai, validasiNilaiAkhir } from '../src/lib/penilaian';
import { faseSesi, statusKehadiran } from '../src/lib/waktu';

const M = 60_000;
const t = { toleransiEditMenit: 1, toleransiKumpulMenit: 15 };
const mulai = new Date('2026-11-28T08:00:00+07:00');
const selesai = new Date('2026-11-28T09:30:00+07:00');
const sesi = { mulai, selesai };

describe('aturan waktu (WAKTU)', () => {
  it('mengikuti tabel fase PRD 5.6', () => {
    expect(faseSesi(sesi, t, new Date(mulai.getTime() - 1))).toBe('BELUM_MULAI');
    expect(faseSesi(sesi, t, mulai)).toBe('BERLANGSUNG');
    expect(faseSesi(sesi, t, new Date(selesai.getTime() + 30_000))).toBe('TOLERANSI_EDIT');
    expect(faseSesi(sesi, t, new Date(selesai.getTime() + 2 * M))).toBe('TOLERANSI_KUMPUL');
    expect(faseSesi(sesi, t, new Date(selesai.getTime() + 15 * M))).toBe('DITUTUP');
  });
  it('kehadiran: hadir sampai batas, lewat batas terlambat', () => {
    expect(statusKehadiran(mulai, 10, new Date(mulai.getTime() + 10 * M))).toBe('HADIR');
    expect(statusKehadiran(mulai, 10, new Date(mulai.getTime() + 10 * M + 1000))).toBe('TERLAMBAT');
  });
});

describe('penilaian (NILAI)', () => {
  const soal = [
    { id: 1, nomor: 1, tipe: 'PG', bobot: 1, opsi: [{ id: 11, benar: true }, { id: 12, benar: false }] },
    { id: 2, nomor: 2, tipe: 'PGK', bobot: 2, opsi: [{ id: 21, benar: true }, { id: 22, benar: true }, { id: 23, benar: false }] },
    { id: 3, nomor: 3, tipe: 'ESAI', bobot: 2, opsi: [] },
  ];
  it('PGK hanya benar bila seluruh pilihan tepat', () => {
    expect(cekBenar(soal[1], [21, 22])).toBe(true);
    expect(cekBenar(soal[1], [21])).toBe(false);
    expect(cekBenar(soal[1], [21, 22, 23])).toBe(false);
  });
  it('nilai saran = pembulatan(poin ÷ total bobot × 100)', () => {
    const h = hitungNilai(soal, new Map<number, unknown>([[1, 11], [2, [22, 21]], [3, 'x']]), { '3': 1 });
    expect(h.skorObjektif).toBe(3);
    expect(h.nilaiSaran).toBe(80);
  });
  it('Nilai Akhir menolak 85,5 dan 101', () => {
    expect(validasiNilaiAkhir('85,5').ok).toBe(false);
    expect(validasiNilaiAkhir('85.5').ok).toBe(false);
    expect(validasiNilaiAkhir('101').ok).toBe(false);
    expect(validasiNilaiAkhir('85')).toEqual({ ok: true, nilai: 85 });
  });
});

describe('pengacakan opsi (SOAL-10)', () => {
  it('sama untuk seed yang sama, berbeda antar siswa', () => {
    const o = [1, 2, 3, 4, 5];
    expect(acakDeterministik(o, 42, 7)).toEqual(acakDeterministik(o, 42, 7));
    const hasil = new Set(Array.from({ length: 10 }, (_, i) => acakDeterministik(o, i * 1000 + 1, 7).join()));
    expect(hasil.size).toBeGreaterThan(3);
  });
});

describe('password baru', () => {
  it('cukup minimal 8 karakter, tanpa syarat campuran huruf/angka', () => {
    expect(validasiPasswordBaru('1234567')).not.toBeNull();
    expect(validasiPasswordBaru('')).not.toBeNull();
    expect(validasiPasswordBaru('12345678')).toBeNull();
    expect(validasiPasswordBaru('abcdefgh')).toBeNull();
    expect(validasiPasswordBaru('ab cd ef')).toBeNull();
  });
});
