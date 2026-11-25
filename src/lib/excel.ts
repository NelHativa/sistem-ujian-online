import ExcelJS from 'exceljs';
import { prisma } from './db';
import { durasi, jam, LABEL_CARA_KUMPUL, LABEL_KEHADIRAN, tanggal } from './format';
import { rekapKelas } from './rekap';
import { getPengaturan } from './settings';

const NAVY = 'FF1E3A8A';

/** REKAP-02: ekspor Excel per kelas per mapel (Lampiran A PRD). */
export async function buatExcelRekap(sesiId: number, kelasId: number, pengekspor: string) {
  const r = await rekapKelas(sesiId, kelasId);
  const t = await getPengaturan();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ujian SMAS Bina Taruna';
  wb.created = new Date();
  const mapel = r.sesi.paket.mapel.nama;
  const jenis = r.sesi.paket.jenisUjian;
  const ta = t.tahunAjaran.replace('/', '-');

  const kepala = (ws: ExcelJS.Worksheet, judul: string, lebar: number) => {
    const info: [string, string][] = [
      ['Sekolah', t.namaSekolah],
      ['Tahun ajaran / semester', `${t.tahunAjaran} / ${t.semester}`],
      ['Jenis ujian', jenis],
      ['Mata pelajaran', mapel],
      ['Kelas', r.kelas.nama],
      ['Guru pengampu', r.guruPengampu],
      ['Sesi', r.semuaSesi.map((s) => `${s.tipe === 'SUSULAN' ? 'Susulan' : 'Reguler'}: ${tanggal(s.mulai)} ${jam(s.mulai)}–${jam(s.selesai)}`).join('; ')],
      ['Diekspor', `${tanggal(new Date())} ${jam(new Date())} oleh ${pengekspor}`],
    ];
    ws.mergeCells(1, 1, 1, lebar);
    const c = ws.getCell(1, 1);
    c.value = judul;
    c.font = { bold: true, size: 14, color: { argb: NAVY } };
    info.forEach(([k, v], i) => {
      ws.getCell(i + 2, 1).value = k;
      ws.getCell(i + 2, 1).font = { bold: true };
      ws.mergeCells(i + 2, 2, i + 2, Math.min(lebar, 8));
      ws.getCell(i + 2, 2).value = v;
    });
    return info.length + 3;
  };
  const gayaJudul = (row: ExcelJS.Row) => {
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.height = 32;
  };
  const siapCetak = (ws: ExcelJS.Worksheet, barisJudul: number, landscape = true) => {
    ws.views = [{ state: 'frozen', ySplit: barisJudul }];
    ws.pageSetup = { paperSize: 9, orientation: landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${barisJudul}:${barisJudul}` };
  };

  // Sheet Rekap Nilai
  const kol = ['No.', 'No. Urut', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Status Kehadiran', 'Sesi', 'Jam Masuk', 'Jam Kumpul', 'Cara Kumpul', 'Soal Dijawab', 'Skor Objektif', 'Nilai Saran', 'Nilai Akhir', 'Status Koreksi', 'Jumlah Pelanggaran', 'Total Durasi Keluar', 'Catatan'];
  const ws = wb.addWorksheet('Rekap Nilai');
  const mulaiTabel = kepala(ws, `Rekap Nilai ${jenis} ${mapel} — ${r.kelas.nama}`, kol.length);
  const hr = ws.getRow(mulaiTabel);
  hr.values = kol;
  gayaJudul(hr);
  r.baris.forEach((b, i) => {
    const row = ws.getRow(mulaiTabel + 1 + i);
    row.values = [
      i + 1,
      b.siswa.noUrut,
      b.siswa.nis,
      b.siswa.nisn ?? '',
      b.siswa.nama,
      b.siswa.jk,
      LABEL_KEHADIRAN[b.kehadiran] ?? b.kehadiran,
      b.tipeSesi === 'SUSULAN' ? 'Susulan' : 'Reguler',
      b.jamMasuk ? jam(b.jamMasuk) : '',
      b.jamKumpul ? jam(b.jamKumpul) : '',
      b.caraKumpul ? LABEL_CARA_KUMPUL[b.caraKumpul] : '',
      b.jamMasuk ? `${b.dijawab}/${b.totalSoal}` : '',
      b.jamMasuk ? `${b.skorObjektif}/${b.totalObjektif}` : '',
      b.nilaiSaran ?? '',
      b.nilaiAkhir ?? '',
      b.sudahDikoreksi ? 'Sudah' : 'Belum',
      b.pelanggaran,
      durasi(b.durasiKeluarDetik),
      b.catatan ?? '',
    ];
    row.eachCell({ includeEmpty: true }, (c, n) => {
      c.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
      if (n !== 5 && n !== 19) c.alignment = { horizontal: 'center' };
    });
    if (b.pelanggaran >= 3) row.getCell(17).font = { bold: true, color: { argb: 'FFDC2626' } };
    row.getCell(3).numFmt = '@';
    row.getCell(4).numFmt = '@';
  });
  [5, 9, 13, 13, 30, 5, 15, 10, 9, 10, 13, 10, 11, 9, 9, 11, 11, 11, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  siapCetak(ws, mulaiTabel);

  // Sheet Ringkasan
  const rs = wb.addWorksheet('Ringkasan');
  const mulaiR = kepala(rs, `Ringkasan ${jenis} ${mapel} — ${r.kelas.nama}`, 4);
  const nilai = r.baris.map((b) => b.nilaiAkhir).filter((n): n is number => n != null).sort((a, b) => a - b);
  const rata = nilai.length ? Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100 : '';
  const median = nilai.length ? (nilai.length % 2 ? nilai[(nilai.length - 1) / 2] : (nilai[nilai.length / 2 - 1] + nilai[nilai.length / 2]) / 2) : '';
  const sebaran = [
    ['0–59', 0, 59],
    ['60–69', 60, 69],
    ['70–79', 70, 79],
    ['80–89', 80, 89],
    ['90–100', 90, 100],
  ] as const;
  const hit = (k: string) => r.baris.filter((b) => b.kehadiran === k).length;
  const data: [string, string | number][] = [
    ['Peserta terdaftar', r.baris.length],
    ['Hadir', hit('HADIR')],
    ['Terlambat', hit('TERLAMBAT')],
    ['Tidak hadir', hit('TIDAK_HADIR')],
    ['Peserta susulan', r.baris.filter((b) => b.tipeSesi === 'SUSULAN').length],
    ['Sudah dinilai', r.baris.filter((b) => b.sudahDikoreksi).length],
    ['Belum dinilai', r.baris.filter((b) => !b.sudahDikoreksi).length],
    ['Rata-rata Nilai Akhir', rata],
    ['Nilai tertinggi', nilai.length ? nilai[nilai.length - 1] : ''],
    ['Nilai terendah', nilai.length ? nilai[0] : ''],
    ['Median', median],
    ...sebaran.map(([l, a, b]) => [`Sebaran nilai ${l}`, nilai.filter((n) => n >= a && n <= b).length] as [string, number]),
    ['Siswa dengan pelanggaran ≥ 3', r.baris.filter((b) => b.pelanggaran >= 3).length],
  ];
  const hR = rs.getRow(mulaiR);
  hR.values = ['Keterangan', 'Jumlah / Nilai'];
  gayaJudul(hR);
  data.forEach(([k, v], i) => {
    const row = rs.getRow(mulaiR + 1 + i);
    row.values = [k, v];
    row.getCell(2).alignment = { horizontal: 'center' };
  });
  rs.getColumn(1).width = 34;
  rs.getColumn(2).width = 18;
  siapCetak(rs, mulaiR, false);

  // Sheet Pelanggaran
  const ps = wb.addWorksheet('Pelanggaran');
  const mulaiP = kepala(ps, `Pelanggaran ${jenis} ${mapel} — ${r.kelas.nama}`, 7);
  const hP = ps.getRow(mulaiP);
  hP.values = ['No. Urut', 'Nama', 'Jumlah Pelanggaran', 'Total Durasi Keluar', 'Waktu Kejadian', 'Tangkapan Layar', 'Sirine Dibunyikan'];
  gayaJudul(hP);
  const logs = await prisma.logAktivitas.findMany({
    where: { pesertaId: { in: r.baris.map((b) => b.pesertaId) }, kode: { in: ['KELUAR_TAB', 'KEMBALI_TAB', 'PRINTSCREEN_TERDETEKSI'] } },
    orderBy: { waktu: 'asc' },
  });
  const ps2 = r.baris.filter((b) => b.pelanggaran > 0 || logs.some((l) => l.pesertaId === b.pesertaId && l.kode === 'PRINTSCREEN_TERDETEKSI'));
  ps2.forEach((b, i) => {
    const milik = logs.filter((l) => l.pesertaId === b.pesertaId);
    const kejadian = milik
      .filter((l) => l.kode === 'KELUAR_TAB')
      .map((l) => {
        const urutan = JSON.parse(l.data).urutan;
        const kembali = milik.find((k) => k.kode === 'KEMBALI_TAB' && JSON.parse(k.data).urutan === urutan);
        const d = kembali ? JSON.parse(kembali.data).durasiDetik : null;
        return `${jam(l.waktu, true)}${d != null ? ` (${durasi(d)})` : ''}`;
      })
      .join('; ');
    const ss = milik.filter((l) => l.kode === 'PRINTSCREEN_TERDETEKSI').map((l) => jam(l.waktu, true)).join('; ');
    const row = ps.getRow(mulaiP + 1 + i);
    row.values = [b.siswa.noUrut, b.siswa.nama, b.pelanggaran, durasi(b.durasiKeluarDetik), kejadian || '—', ss || '—', b.sirine ? 'Ya' : 'Tidak'];
    row.alignment = { wrapText: true, vertical: 'top' };
    if (b.pelanggaran >= 3) row.getCell(3).font = { bold: true, color: { argb: 'FFDC2626' } };
  });
  if (!ps2.length) ps.getRow(mulaiP + 1).values = ['', 'Tidak ada pelanggaran tercatat.'];
  [9, 30, 12, 12, 48, 18, 12].forEach((w, i) => (ps.getColumn(i + 1).width = w));
  siapCetak(ps, mulaiP);

  const nama = `Rekap_${jenis}_${mapel.replace(/\s+/g, '')}_${r.kelas.nama.replace(/\s+/g, '-')}_${ta}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  return { nama, buffer };
}
