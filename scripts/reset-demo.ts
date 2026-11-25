/**
 * Reset demo: hapus database SQLite lokal, buat ulang skema, lalu isi data dummy.
 * Argumen diteruskan ke seed, mis.: npm run demo:reset -- --mulai 09:00
 */
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
for (const f of ['ujian.db', 'ujian.db-journal', 'ujian.db-wal', 'ujian.db-shm']) {
  const p = path.join(dataDir, f);
  if (existsSync(p)) rmSync(p);
}
execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
const args = process.argv.slice(2).map((a) => JSON.stringify(a)).join(' ');
execSync(`npx tsx prisma/seed.ts ${args}`, { stdio: 'inherit' });
