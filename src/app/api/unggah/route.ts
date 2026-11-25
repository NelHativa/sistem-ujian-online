import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { guruLogin } from '@/lib/auth';
import { FOLDER_UNGGAHAN } from '@/lib/unggahan';

const MAKS = 5 * 1024 * 1024;

/** Unggah gambar badan soal (SOAL-03): JPG/PNG, maks. 5 MB. */
export async function POST(req: Request) {
  if (!(await guruLogin())) return NextResponse.json({ pesan: 'Harus login sebagai guru.' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('berkas');
  if (!(file instanceof File)) return NextResponse.json({ pesan: 'Berkas tidak ditemukan.' }, { status: 400 });
  if (file.size > MAKS) return NextResponse.json({ pesan: 'Ukuran gambar maksimal 5 MB.' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!png && !jpg) return NextResponse.json({ pesan: 'Format gambar harus JPG atau PNG.' }, { status: 400 });
  await mkdir(FOLDER_UNGGAHAN, { recursive: true });
  const nama = `${Date.now()}-${randomBytes(4).toString('hex')}${png ? '.png' : '.jpg'}`;
  await writeFile(path.join(FOLDER_UNGGAHAN, nama), buf);
  return NextResponse.json({ nama });
}
