import { readFile } from 'fs/promises';
import path from 'path';
import { FOLDER_UNGGAHAN, namaAman } from '@/lib/unggahan';

const TIPE: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params;
  const aman = namaAman(decodeURIComponent(nama));
  if (!aman) return new Response('Tidak ditemukan', { status: 404 });
  try {
    const buf = await readFile(path.join(FOLDER_UNGGAHAN, aman));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': TIPE[path.extname(aman).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new Response('Tidak ditemukan', { status: 404 });
  }
}
