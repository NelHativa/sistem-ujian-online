'use client';

// Sirine dibuat dengan Web Audio (tanpa file suara). Izin suara dibuka saat siswa menekan "Mulai" (AMAN-10).
let ctx: AudioContext | null = null;
let sedangBunyi = false;

export function bukaIzinSuara() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    // Bunyi senyap sangat singkat agar iOS/Android menganggap audio sudah diizinkan.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.05);
  } catch {
    /* perangkat tidak mendukung audio */
  }
}

export function bunyikanSirine(detik = 10) {
  try {
    if (!ctx) bukaIzinSuara();
    if (!ctx || sedangBunyi) return;
    if (ctx.state === 'suspended') ctx.resume();
    sedangBunyi = true;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o2.type = 'square';
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.1);
    for (let t = 0; t < detik; t += 1) {
      o.frequency.setValueAtTime(650, t0 + t);
      o.frequency.linearRampToValueAtTime(1350, t0 + t + 0.5);
      o.frequency.linearRampToValueAtTime(650, t0 + t + 1);
      o2.frequency.setValueAtTime(660, t0 + t);
      o2.frequency.linearRampToValueAtTime(1360, t0 + t + 0.5);
      o2.frequency.linearRampToValueAtTime(660, t0 + t + 1);
    }
    g.gain.setValueAtTime(0.5, t0 + detik - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + detik);
    const mix = ctx.createGain();
    mix.gain.value = 0.35;
    o2.connect(mix).connect(g);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o2.start(t0);
    o.stop(t0 + detik);
    o2.stop(t0 + detik);
    o.onended = () => {
      sedangBunyi = false;
    };
    if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400, 200, 400]);
  } catch {
    sedangBunyi = false;
  }
}

export function pastikanAudioAktif() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => undefined);
}
