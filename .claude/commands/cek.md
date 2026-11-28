---
description: Jalankan typecheck, test, dan build, lalu laporkan hasilnya
allowed-tools: Bash(npm run typecheck), Bash(npm test), Bash(npm run build), Bash(git status *)
---

Jalankan pemeriksaan proyek berikut **berurutan**, dan lanjutkan ke langkah berikutnya walaupun ada yang gagal agar semua masalah terlihat:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`

Sesudah itu jalankan `git status --short` untuk melihat apakah ada perubahan yang belum di-commit.

Laporkan dalam Bahasa Indonesia sebagai tabel singkat (Pemeriksaan | Hasil | Catatan). Untuk setiap kegagalan, kutip baris error yang relevan beserta `file:baris`, lalu sebutkan dugaan penyebabnya. Jangan memperbaiki apa pun kecuali diminta.

$ARGUMENTS
