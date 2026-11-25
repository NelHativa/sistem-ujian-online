/**
 * Server HTTPS untuk demo di jaringan lokal (Wake Lock & fitur browser lain butuh koneksi aman).
 * Butuh sertifikat di folder certs/ (cert.pem & key.pem), misalnya dibuat dengan mkcert:
 *   mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 192.168.1.10
 * Jalankan setelah `npm run build`:  npm run start:https
 */
import { readFileSync } from 'fs';
import { createServer } from 'https';
import { networkInterfaces } from 'os';
import next from 'next';

const port = Number(process.env.PORT ?? 3443);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const opsi = { cert: readFileSync('certs/cert.pem'), key: readFileSync('certs/key.pem') };
  createServer(opsi, (req, res) => handle(req, res)).listen(port, '0.0.0.0', () => {
    const ip = Object.values(networkInterfaces())
      .flat()
      .filter((n) => n && n.family === 'IPv4' && !n.internal)
      .map((n) => n!.address);
    console.log(`HTTPS siap: https://localhost:${port}`);
    for (const a of ip) console.log(`  dari HP/laptop lain: https://${a}:${port}`);
  });
});
