'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatSisa } from '@/lib/jamServer';

/** Hitung mundur berbasis jam server; memuat ulang halaman saat mencapai nol. */
export function HitungMundur({ target, serverNow, refreshSaatNol = true }: { target: string; serverNow: string; refreshSaatNol?: boolean }) {
  const router = useRouter();
  const basis = useRef({ server: new Date(serverNow).getTime(), perf: 0 });
  const [sisa, setSisa] = useState(() => new Date(target).getTime() - new Date(serverNow).getTime());
  useEffect(() => {
    basis.current = { server: new Date(serverNow).getTime(), perf: performance.now() };
    let selesai = false;
    const id = setInterval(() => {
      const now = basis.current.server + (performance.now() - basis.current.perf);
      const s = new Date(target).getTime() - now;
      setSisa(s);
      if (s <= 0 && !selesai && refreshSaatNol) {
        selesai = true;
        setTimeout(() => router.refresh(), 600);
      }
    }, 250);
    return () => clearInterval(id);
  }, [target, serverNow, refreshSaatNol, router]);
  return <span className="angka font-mono">{formatSisa(sisa)}</span>;
}
