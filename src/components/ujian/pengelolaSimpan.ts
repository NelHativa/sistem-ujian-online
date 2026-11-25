'use client';

import { sinkronJam } from '@/lib/jamServer';
import type { IsiJawaban } from './tipe';

export type StatusSimpan = 'tersimpan' | 'menyimpan' | 'offline' | 'terkunci';

type Entri = { isi: IsiJawaban; ragu: boolean; v: number };
type Peristiwa = { kode: string; data: Record<string, unknown>; t: number };

type Callback = {
  status: (s: StatusSimpan) => void;
  pelanggaran: (n: number) => void;
  loginHabis: () => void;
  sudahKumpul: (jamKumpul: string) => void;
  detak: (d: { fase: string; waktu: { mulai: string; selesai: string; batasEdit: string; batasKumpul: string } }) => void;
};

/**
 * Pengelola simpan otomatis (UJI-09/10/11):
 * - setiap perubahan jawaban masuk antrean yang juga disalin ke penyimpanan browser,
 * - antrean dikirim ke server; bila gagal (offline) dicoba ulang otomatis,
 * - peristiwa anti-kecurangan ikut diantrekan agar tidak hilang saat koneksi putus,
 * - heartbeat menyinkronkan jam server dan mendeteksi paksa kumpul.
 */
export class PengelolaSimpan {
  private antrean: Record<string, Entri> = {};
  private peristiwa: Peristiwa[] = [];
  private versi = 0;
  private sedang = false;
  private ulang = false;
  private timerDebounce: ReturnType<typeof setTimeout> | null = null;
  private timerCoba: ReturnType<typeof setTimeout> | null = null;
  private timerDetak: ReturnType<typeof setInterval> | null = null;
  private offlineSejak: number | null = null;
  private terkunci = false;
  private mati = false;
  private kunciLokal: string;

  constructor(
    private sesiId: number,
    pesertaId: number,
    private cb: Callback,
  ) {
    this.kunciLokal = `ujian-antrean-${pesertaId}`;
    try {
      const raw = localStorage.getItem(this.kunciLokal);
      if (raw) {
        const j = JSON.parse(raw);
        this.antrean = j.antrean ?? {};
        this.peristiwa = j.peristiwa ?? [];
        this.offlineSejak = j.offlineSejak ?? null;
      }
    } catch {
      /* abaikan */
    }
    this.versi = Date.now();
  }

  /** Jawaban yang belum terkirim (dipakai untuk memulihkan tampilan setelah reload). */
  tertunda() {
    return Object.fromEntries(Object.entries(this.antrean).map(([k, v]) => [k, { isi: v.isi, ragu: v.ragu }]));
  }

  mulai() {
    this.timerDetak = setInterval(() => this.detak(), 10_000);
    window.addEventListener('online', this.saatOnline);
    window.addEventListener('offline', this.saatOffline);
    if (!navigator.onLine) this.saatOffline();
    this.kirim();
    this.detak();
  }

  hentikan() {
    this.mati = true;
    if (this.timerDetak) clearInterval(this.timerDetak);
    if (this.timerDebounce) clearTimeout(this.timerDebounce);
    if (this.timerCoba) clearTimeout(this.timerCoba);
    window.removeEventListener('online', this.saatOnline);
    window.removeEventListener('offline', this.saatOffline);
  }

  private saatOnline = () => this.kirim();
  private saatOffline = () => {
    if (this.offlineSejak == null) this.offlineSejak = Date.now();
    this.simpanLokal();
    this.cb.status('offline');
  };

  ubah(soalId: number, isi: IsiJawaban, ragu: boolean, segera: boolean) {
    if (this.terkunci) return;
    this.antrean[String(soalId)] = { isi, ragu, v: ++this.versi };
    this.simpanLokal();
    if (this.offlineSejak == null) this.cb.status('menyimpan');
    if (this.timerDebounce) clearTimeout(this.timerDebounce);
    if (segera) this.kirim();
    else this.timerDebounce = setTimeout(() => this.kirim(), 2000);
  }

  catat(kode: string, data: Record<string, unknown> = {}) {
    this.peristiwa.push({ kode, data, t: Date.now() });
    this.simpanLokal();
    this.kirim();
  }

  adaTertunda() {
    return Object.keys(this.antrean).length > 0 || this.peristiwa.length > 0;
  }

  private simpanLokal() {
    try {
      localStorage.setItem(this.kunciLokal, JSON.stringify({ antrean: this.antrean, peristiwa: this.peristiwa, offlineSejak: this.offlineSejak }));
    } catch {
      /* penyimpanan penuh / diblokir */
    }
  }

  private async panggil(url: string, method: string, body: unknown) {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
      cache: 'no-store',
    });
    if (r.status === 401) {
      this.cb.loginHabis();
      throw new GagalTetap();
    }
    return r;
  }

  async kirim(): Promise<boolean> {
    if (this.mati) return false;
    if (this.sedang) {
      this.ulang = true;
      return false;
    }
    if (this.timerDebounce) {
      clearTimeout(this.timerDebounce);
      this.timerDebounce = null;
    }
    const base = `/api/ujian/${this.sesiId}`;
    this.sedang = true;
    let berhasil = true;
    try {
      // Peristiwa koneksi: dicatat setelah tersambung kembali.
      if (this.offlineSejak != null && navigator.onLine) {
        const ping = await fetch(`${base}/detak`, { method: 'POST', cache: 'no-store' });
        if (ping.status === 401) {
          this.cb.loginHabis();
          throw new GagalTetap();
        }
        const lama = Math.round((Date.now() - this.offlineSejak) / 1000);
        this.peristiwa.unshift(
          { kode: 'KONEKSI_PUTUS', data: { sejak: new Date(this.offlineSejak).toISOString() }, t: this.offlineSejak },
          { kode: 'KONEKSI_TERSAMBUNG', data: { lamaTerputusDetik: lama }, t: Date.now() },
        );
        this.offlineSejak = null;
        this.simpanLokal();
      }
      while (this.peristiwa.length) {
        const ev = this.peristiwa[0];
        const r = await this.panggil(`${base}/peristiwa`, 'POST', { kode: ev.kode, data: ev.data });
        if (!r.ok && r.status >= 500) throw new Error('server');
        const j = await r.json().catch(() => ({}));
        if (typeof j.pelanggaran === 'number') this.cb.pelanggaran(j.pelanggaran);
        this.peristiwa.shift();
        this.simpanLokal();
      }
      const entri = Object.entries(this.antrean);
      if (entri.length && !this.terkunci) {
        this.cb.status('menyimpan');
        const items = entri.map(([soalId, v]) => ({ soalId: Number(soalId), isi: v.isi, ragu: v.ragu }));
        const r = await this.panggil(`${base}/jawaban`, 'PUT', { items });
        const j = await r.json().catch(() => ({}));
        if (r.status === 409) {
          this.antrean = {};
          this.simpanLokal();
          if (j.kode === 'SUDAH_KUMPUL') this.detak();
          this.terkunci = true;
          this.cb.status('terkunci');
          return false;
        }
        if (!r.ok) throw new Error('server');
        if (j.serverNow) sinkronJam(j.serverNow);
        for (const [id, v] of entri) if (this.antrean[id]?.v === v.v) delete this.antrean[id];
        this.simpanLokal();
      }
      if (!this.terkunci) this.cb.status(Object.keys(this.antrean).length ? 'menyimpan' : 'tersimpan');
    } catch (e) {
      berhasil = false;
      if (!(e instanceof GagalTetap)) {
        if (this.offlineSejak == null) this.offlineSejak = Date.now();
        this.simpanLokal();
        this.cb.status('offline');
        if (this.timerCoba) clearTimeout(this.timerCoba);
        this.timerCoba = setTimeout(() => this.kirim(), 3000);
      }
    } finally {
      this.sedang = false;
      if (this.ulang) {
        this.ulang = false;
        setTimeout(() => this.kirim(), 0);
      }
    }
    return berhasil;
  }

  /** Menunggu antrean kosong (dipakai sebelum mengumpulkan). */
  async kosongkan(batasMs = 8000) {
    const akhir = Date.now() + batasMs;
    while (this.adaTertunda() && Date.now() < akhir && !this.terkunci) {
      await this.kirim();
      if (this.adaTertunda()) await new Promise((r) => setTimeout(r, 500));
    }
    return !this.adaTertunda() || this.terkunci;
  }

  async detak() {
    if (this.mati) return;
    try {
      const t0 = performance.now();
      const r = await fetch(`/api/ujian/${this.sesiId}/detak`, { method: 'POST', cache: 'no-store' });
      const rtt = performance.now() - t0;
      if (r.status === 401) return this.cb.loginHabis();
      if (!r.ok) throw new Error('server');
      const j = await r.json();
      sinkronJam(j.serverNow, rtt);
      this.cb.pelanggaran(j.pelanggaran);
      this.cb.detak({ fase: j.fase, waktu: j.waktu });
      if (j.jamKumpul) this.cb.sudahKumpul(j.jamKumpul);
      if (this.offlineSejak != null || this.adaTertunda()) this.kirim();
    } catch {
      if (this.offlineSejak == null) {
        this.offlineSejak = Date.now();
        this.simpanLokal();
      }
      this.cb.status('offline');
      if (this.timerCoba) clearTimeout(this.timerCoba);
      this.timerCoba = setTimeout(() => this.kirim(), 3000);
    }
  }
}

class GagalTetap extends Error {}
