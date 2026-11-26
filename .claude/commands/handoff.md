---
description: Perbarui CONTEXT.md dengan ringkasan sesi ini agar sesi berikutnya bisa langsung lanjut
allowed-tools: Bash(git status *), Bash(git log *), Bash(git diff *), Bash(git branch *), Read, Edit
---

Tugasmu: memperbarui `CONTEXT.md` supaya sesi Claude Code berikutnya (atau anggota tim lain) bisa melanjutkan tanpa membaca percakapan ini.

1. Kumpulkan fakta, jangan menebak:
   - `git status --short`, `git log --oneline -10`, dan `git branch -vv`
   - perubahan yang sudah dan belum di-commit selama sesi ini (`git diff --stat`)
   - apa yang dikerjakan, diputuskan, ditemukan, atau gagal di percakapan ini
2. Edit `CONTEXT.md`:
   - **Status terkini**: perbarui tanggal "Terakhir diperbarui" dan butir-butir yang sudah berubah. Hapus butir yang sudah tidak benar.
   - **Checklist menuju demo**: centang item yang terbukti selesai di sesi ini.
   - **Keputusan & batasan** dan **Pertanyaan terbuka**: tambahkan yang baru, dan hapus pertanyaan yang sudah terjawab.
   - **Log sesi**: tambahkan entri baru **di paling atas** dengan format `### YYYY-MM-DD: <judul singkat>`, berisi butir "dikerjakan", "belum selesai" (sebutkan file dan alasannya), dan "**Berikutnya:**".
   - Bila log sesi lebih dari 8 entri, ringkas entri-entri tertua menjadi satu entri "Ringkasan sebelumnya".
3. Tulis dalam Bahasa Indonesia, padat dan faktual. Jangan menyalin isi `CLAUDE.md` atau `README.md`.
4. Jangan commit kecuali diminta. Tampilkan ringkasan perubahan `CONTEXT.md` kepada pengguna.

Catatan tambahan dari pengguna (opsional): $ARGUMENTS
