'use client';

import { useEffect, useState } from 'react';
import { jamServerSekarang } from '@/lib/jamServer';

/** Watermark semi-transparan berulang berisi nama, NIS, dan waktu (AMAN-01). */
export function Watermark({ nama, nis }: { nama: string; nis: string }) {
  const [waktu, setWaktu] = useState('');
  useEffect(() => {
    const upd = () =>
      setWaktu(
        new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
          .format(new Date(jamServerSekarang()))
          .replace(/\./g, ':'),
      );
    upd();
    const id = setInterval(upd, 20_000);
    return () => clearInterval(id);
  }, []);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const teks = `${esc(nama)} · ${esc(nis)} · ${waktu}`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='170'><text x='10' y='110' transform='rotate(-22 180 85)' font-family='Inter,Arial' font-size='15' font-weight='600' fill='#0F172A' fill-opacity='0.09'>${teks}</text></svg>`;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat' }}
    />
  );
}
