import path from 'path';

export const FOLDER_UNGGAHAN = path.join(process.cwd(), 'data', 'uploads');

export function namaAman(nama: string) {
  const base = path.basename(nama);
  return /^[a-zA-Z0-9._-]+$/.test(base) ? base : null;
}
