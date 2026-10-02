'use strict';

const { parseTanggalIDDetail, formatTanggalID } = require('./index.js');

// Kunci: gunakan referenceDate tetap biar hasil test konsisten
// Jumat, 25 September 2026
const REF = new Date(2026, 8, 25);
const opts = { referenceDate: REF };

const kasus = [
  // Relatif tetap
  'hari ini', 'sekarang', 'besok', 'lusa', 'kemarin', 'kemarin lusa',
  // N satuan
  '3 hari lagi', '3 hari yang lalu', '2 minggu lagi', '2 minggu lalu',
  '1 bulan lagi', '1 bulan yang lalu', '5 tahun lalu', 'seminggu lagi', 'sebulan lalu',
  // satuan depan/lalu implisit
  'minggu depan', 'minggu lalu', 'bulan depan', 'bulan lalu', 'tahun depan', 'tahun lalu',
  // nama hari
  'senin', 'senin depan', 'senin lalu', 'senin kemarin', 'jumat ini', 'ahad', 'minggu',
  // tanggal N family (fokus request user)
  'tanggal 12', 'tgl 12', 'tanggal 12 nanti', 'tgl. 21',
  'tanggal 12 bulan depan', 'tanggal 12 bulan lalu', 'tanggal 30 bulan depan',
  'tanggal 12 september', 'tanggal 12 september 2026', 'tanggal 12 tahun depan',
  'pada tanggal 12', 'di tgl 5',
  // angka saja
  '12', '5',
  // awal/akhir
  'akhir bulan', 'awal bulan', 'akhir bulan depan', 'awal bulan lalu', 'akhir tahun', 'awal tahun',
  // tanpa tahun (auto-roll ke tahun depan kalau sudah lewat; ref = 25 Sep 2026)
  '12 jun', '23 okt', '22-1', '12-3', '30/9', '1 oktober', '25 september',
  // absolut
  '25 September 2026', 'Senin, 25 September 2026', '25 Sep 2026', '17 Agt 1945',
  '25/09/2026', '25-09-2026', '25.09.2026', '2026-09-25', 'September 2026',
  // tidak valid
  'teks acak yang tidak valid', 'tanggal 40', '31 Februari 2026',
];

console.log(`Referensi "hari ini": ${formatTanggalID(REF, { withDay: true })}`);
console.log('---');
for (const k of kasus) {
  const { date, rule } = parseTanggalIDDetail(k, opts);
  const hasil = date ? formatTanggalID(date, { withDay: true }) : 'null (tidak valid)';
  console.log(`"${k}"`.padEnd(34), '->', hasil.padEnd(28), rule ? `[rule: ${rule}]` : '');
}
