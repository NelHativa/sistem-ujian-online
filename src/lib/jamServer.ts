'use client';

// Jam server di perangkat: memakai performance.now() (monoton) sehingga mengubah jam HP tidak berpengaruh (WAKTU-01).
let basisServer = 0;
let basisPerf = 0;
let siap = false;

export function sinkronJam(serverNowIso: string, rttMs = 0) {
  basisServer = new Date(serverNowIso).getTime() + rttMs / 2;
  basisPerf = performance.now();
  siap = true;
}

export function jamServerSekarang() {
  if (!siap) return Date.now();
  return basisServer + (performance.now() - basisPerf);
}

export function formatSisa(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const j = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const d = s % 60;
  const dd = (n: number) => String(n).padStart(2, '0');
  return j > 0 ? `${j}:${dd(m)}:${dd(d)}` : `${dd(m)}:${dd(d)}`;
}
