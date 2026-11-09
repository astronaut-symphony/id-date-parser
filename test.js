'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseTanggalIDDetail, formatTanggalID } = require('./index.js');

const p2 = (n) => String(n).padStart(2, '0');
// 'YYYY-MM-DD' kalau tanpa jam, 'YYYY-MM-DD HH:mm' kalau hasTime
function ringkas({ date, hasTime }) {
  if (!date) return null;
  const tgl = `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}`;
  return hasTime ? `${tgl} ${p2(date.getHours())}:${p2(date.getMinutes())}` : tgl;
}

// Kunci: referenceDate tetap biar hasil konsisten. Jumat, 25 September 2026
const REF = new Date(2026, 8, 25);

const kasus = [
  // Relatif tetap
  ['hari ini', '2026-09-25'], ['sekarang', '2026-09-25'], ['besok', '2026-09-26'],
  ['lusa', '2026-09-27'], ['kemarin', '2026-09-24'], ['kemarin lusa', '2026-09-23'],
  // N satuan
  ['3 hari lagi', '2026-09-28'], ['3 hari yang lalu', '2026-09-22'],
  ['2 minggu lagi', '2026-10-09'], ['2 minggu lalu', '2026-09-11'],
  ['1 bulan lagi', '2026-10-25'], ['1 bulan yang lalu', '2026-08-25'],
  ['5 tahun lalu', '2021-09-25'], ['seminggu lagi', '2026-10-02'], ['sebulan lalu', '2026-08-25'],
  ['3 hari ke depan', '2026-09-28'], ['3 hari kedepan', '2026-09-28'],
  ['seminggu ke depan', '2026-10-02'], ['2 pekan lagi', '2026-10-09'],
  // satuan depan/lalu
  ['minggu depan', '2026-10-02'], ['minggu lalu', '2026-09-18'], ['pekan depan', '2026-10-02'],
  ['bulan depan', '2026-10-25'], ['bulan lalu', '2026-08-25'],
  ['tahun depan', '2027-09-25'], ['tahun lalu', '2025-09-25'],
  // nama hari
  ['senin', '2026-09-28'], ['senin depan', '2026-09-28'], ['senin lalu', '2026-09-21'],
  ['senin kemarin', '2026-09-21'], ['jumat ini', '2026-09-25'], ['jumat depan', '2026-10-02'],
  ['ahad', '2026-09-27'], ['minggu', '2026-09-27'], ['hari senin', '2026-09-28'],
  ['hari minggu depan', '2026-09-27'],
  // hari di pekan tertentu
  ['senin minggu depan', '2026-09-28'], ['jumat minggu ini', '2026-09-25'],
  ['senin minggu ini', '2026-09-21'], ['sabtu pekan depan', '2026-10-03'],
  ['minggu minggu lalu', '2026-09-20'],
  ['rabu 2 minggu lagi', '2026-10-07'], ['jumat 2 minggu lagi', '2026-10-09'], ['rabu 2 minggu ke depan', '2026-10-07'],
  ['sabtu seminggu lagi', '2026-10-03'], ['senin 3 minggu lalu', '2026-08-31'], ['hari rabu 2 pekan lagi', '2026-10-07'],
  ['rabu 2 minggu lagi jam 3 sore', '2026-10-07 15:00'], ['rabu 2 mgg lg', '2026-10-07'],
  // tanggal N
  ['tanggal 12', '2026-09-12'], ['tgl 12', '2026-09-12'], ['tanggal 12 nanti', '2026-10-12'],
  ['tgl. 21', '2026-09-21'], ['tanggal 12 bulan depan', '2026-10-12'],
  ['tanggal 12 bulan lalu', '2026-08-12'], ['tanggal 30 bulan depan', '2026-10-30'],
  ['tanggal 12 september', '2026-09-12'], ['tanggal 12 september 2026', '2026-09-12'],
  ['tanggal 12 tahun depan', '2027-09-12'], ['pada tanggal 12', '2026-09-12'], ['di tgl 5', '2026-09-05'],
  // angka saja
  ['12', '2026-09-12'], ['5', '2026-09-05'],
  // awal/akhir
  ['akhir bulan', '2026-09-30'], ['awal bulan', '2026-09-01'], ['akhir bulan depan', '2026-10-31'],
  ['awal bulan lalu', '2026-08-01'], ['akhir tahun', '2026-12-31'], ['awal tahun', '2026-01-01'],
  // tanpa tahun (auto-roll)
  ['12 jun', '2027-06-12'], ['23 okt', '2026-10-23'], ['22-1', '2027-01-22'], ['12-3', '2027-03-12'],
  ['30/9', '2026-09-30'], ['1 oktober', '2026-10-01'], ['25 september', '2026-09-25'],
  ['29 februari', '2028-02-29'],
  // hari tetap
  ['natal', '2026-12-25'], ['hari natal', '2026-12-25'], ['tahun baru', '2027-01-01'],
  ['kemerdekaan', '2027-08-17'], ['17 agustus', '2027-08-17'],
  // absolut
  ['25 September 2026', '2026-09-25'], ['Senin, 25 September 2026', '2026-09-25'],
  ['25 Sep 2026', '2026-09-25'], ['17 Agt 1945', '1945-08-17'], ['25/09/2026', '2026-09-25'],
  ['25-09-2026', '2026-09-25'], ['25.09.2026', '2026-09-25'], ['2026-09-25', '2026-09-25'],
  ['September 2026', '2026-09-01'],
  // tidak valid
  ['teks acak yang tidak valid', null], ['tanggal 40', null], ['31 Februari 2026', null],
  ['tanggal 29 februari', null], ['31 februari', null], ['', null],
  ['besok jam 24', null], ['besok jam 10.75', null], ['jam 99', null], ['teks 10:30', null],

  // --- dengan waktu ---
  ['besok jam 10', '2026-09-26 10:00'], ['besok jam 10.30', '2026-09-26 10:30'],
  ['besok jam 10:30', '2026-09-26 10:30'], ['besok pukul 14.45', '2026-09-26 14:45'],
  ['besok pada jam 10', '2026-09-26 10:00'], ['pada jam 10 malam', '2026-09-25 22:00'],
  // singkatan
  ['besok jm 9', '2026-09-26 09:00'], ['besok jm 9 mlm', '2026-09-26 21:00'],
  ['besok pkl 7 pg', '2026-09-26 07:00'], ['besok mlm', '2026-09-26 20:00'],
  ['besok sre', '2026-09-26 16:00'], ['besok jam 3 sr', '2026-09-26 15:00'],
  ['lusa jam 7 pagi wib', '2026-09-27 07:00'],
  // periode saja
  ['besok pagi', '2026-09-26 08:00'], ['besok siang', '2026-09-26 12:00'],
  ['besok sore', '2026-09-26 16:00'], ['besok malam', '2026-09-26 20:00'],
  ['besok subuh', '2026-09-26 04:00'], ['besok tengah malam', '2026-09-26 00:00'],
  ['kemarin malam', '2026-09-24 20:00'],
  // jam + periode (12 jam -> 24 jam)
  ['besok jam 8 pagi', '2026-09-26 08:00'], ['besok jam 3 sore', '2026-09-26 15:00'],
  ['besok jam 1 siang', '2026-09-26 13:00'], ['besok jam 11 siang', '2026-09-26 11:00'],
  ['besok jam 12 malam', '2026-09-26 00:00'], ['besok 9 malam', '2026-09-26 21:00'],
  ['besok jam 15 sore', '2026-09-26 15:00'],
  ['besok jam setengah 3 sore', '2026-09-26 14:30'], ['besok setengah 12 malam', '2026-09-26 23:30'],
  ['10.30 malam', '2026-09-25 22:30'], ['12.30 siang', '2026-09-25 12:30'],
  // waktu digabung dengan bentuk tanggal lain
  ['tanggal 12 jam 3 sore', '2026-09-12 15:00'], ['tanggal 12 pagi', '2026-09-12 08:00'],
  ['senin depan jam 9 pagi', '2026-09-28 09:00'], ['senin 8 pagi', '2026-09-28 08:00'],
  ['3 hari lagi jam 5 sore', '2026-09-28 17:00'],
  ['25 september 2026 14:30', '2026-09-25 14:30'], ['2026-09-25 14:30', '2026-09-25 14:30'],
  ['25/09/2026 jam 14.30', '2026-09-25 14:30'],
  ['25 september 2026 jam 8 pagi', '2026-09-25 08:00'],
  ['Senin, 25 September 2026 jam 8 pagi', '2026-09-25 08:00'],
  // cuma waktu -> hari ini
  ['jam 10', '2026-09-25 10:00'], ['10 pagi', '2026-09-25 10:00'], ['pagi ini', '2026-09-25 08:00'],
  ['malam ini', '2026-09-25 20:00'], ['sore', '2026-09-25 16:00'],
  ['tengah malam', '2026-09-25 00:00'], ['tengah hari', '2026-09-25 12:00'],
];

let gagal = 0;
for (const [input, harapan] of kasus) {
  const hasil = ringkas(parseTanggalIDDetail(input, { referenceDate: REF }));
  if (hasil !== harapan) {
    gagal++;
    console.error(`GAGAL "${input}": harapan ${harapan}, dapat ${hasil}`);
  }
}

// singkatan umum (hasil harus persis sama dengan bentuk bakunya, dan bukan tebakan)
for (const [input, baku] of [
  ['hr ini', 'hari ini'], ['3 hr lagi', '3 hari lagi'], ['3 hr lg', '3 hari lagi'], ['minggu dpn', 'minggu depan'],
  ['bln dpn', 'bulan depan'], ['thn dpn', 'tahun depan'], ['hr senin', 'hari senin'], ['sen', 'senin'],
  ['sel dpn', 'selasa depan'], ['jum dpn', 'jumat depan'], ['bsk', 'besok'], ['lsa', 'lusa'],
  ['kmrn', 'kemarin'], ['skrg', 'sekarang'], ['bsk jam 8 pg', 'besok jam 8 pagi'],
  ['tgl 12 bln dpn', 'tanggal 12 bulan depan'], ['12 ags', '12 agustus'], ['3 mgg lagi', '3 minggu lagi'],
]) {
  const a = parseTanggalIDDetail(input, { referenceDate: REF });
  const b = parseTanggalIDDetail(baku, { referenceDate: REF });
  if (!a.date || ringkas(a) !== ringkas(b) || a.assumed) { gagal++; console.error(`GAGAL singkatan "${input}" != "${baku}"`); }
}

// typo: tebakan ditandai assumed + corrections
for (const [input, harapan, koreksi] of [
  ['senn', '2026-09-28', 'senn>senin'], ['bsok', '2026-09-26', 'bsok>besok'],
  ['bsok jam 10', '2026-09-26 10:00', 'bsok>besok'], ['mingu depan', '2026-10-02', 'mingu>minggu'],
  ['tangal 12', '2026-09-12', 'tangal>tanggal'], ['jumt', '2026-09-25', 'jumt>jumat'],
  ['slasa', '2026-09-29', 'slasa>selasa'], ['kemarn', '2026-09-24', 'kemarn>kemarin'],
  ['25 septembr 2026', '2026-09-25', 'septembr>september'], ['sabto', '2026-09-26', 'sabto>sabtu'],
  ['senen depan', '2026-09-28', 'senen>senin'], ['besok soore', '2026-09-26 16:00', 'soore>sore'],
  ['bsok mlm', '2026-09-26 20:00', 'bsok>besok'],
]) {
  const r = parseTanggalIDDetail(input, { referenceDate: REF });
  const dapat = ringkas(r);
  const k = r.corrections.map((c) => `${c.from}>${c.to}`).join(',');
  if (dapat !== harapan || !r.assumed || k !== koreksi) {
    gagal++;
    console.error(`GAGAL typo "${input}": harapan ${harapan} [${koreksi}], dapat ${dapat} [${k}] assumed=${r.assumed}`);
  }
}
// typo tidak boleh menebak sembarangan, dan bisa dimatikan
for (const input of ['asdf', 'senxx', 'teks acak yang tidak valid', 'hati', 'xyz', 'nama saya budi']) {
  const r = parseTanggalIDDetail(input, { referenceDate: REF });
  if (r.date) { gagal++; console.error(`GAGAL typo "${input}" seharusnya null, dapat ${ringkas(r)}`); }
}
if (parseTanggalIDDetail('senn', { referenceDate: REF, fuzzy: false }).date) { gagal++; console.error('GAGAL fuzzy:false'); }
if (parseTanggalIDDetail('senin', { referenceDate: REF }).assumed) { gagal++; console.error('GAGAL senin bukan tebakan'); }

// clamp akhir bulan (referensi 31 Januari)
const REF2 = new Date(2026, 0, 31);
for (const [input, harapan] of [['1 bulan lagi', '2026-02-28'], ['tanggal 31 bulan depan', '2026-02-28']]) {
  const hasil = ringkas(parseTanggalIDDetail(input, { referenceDate: REF2 }));
  if (hasil !== harapan) { gagal++; console.error(`GAGAL "${input}": harapan ${harapan}, dapat ${hasil}`); }
}

// "rabu 2 minggu lagi" dari Senin 9 November 2026 -> Rabu 25 November 2026
{
  const hasil = ringkas(parseTanggalIDDetail('rabu 2 minggu lagi', { referenceDate: new Date(2026, 10, 9) }));
  if (hasil !== '2026-11-25') { gagal++; console.error(`GAGAL "rabu 2 minggu lagi" (ref 9 Nov): dapat ${hasil}`); }
}

// formatter
assert.strictEqual(formatTanggalID(new Date(2026, 8, 25)), '25 September 2026');
assert.strictEqual(formatTanggalID(new Date(2026, 8, 25), { withDay: true }), 'Jumat, 25 September 2026');
assert.strictEqual(formatTanggalID(new Date(2026, 8, 25, 9, 5), { withTime: true }), '25 September 2026 pukul 09.05');
assert.strictEqual(formatTanggalID(new Date(NaN)), '');

// docs/index.js (dipakai demo) harus sama dengan index.js; salin ulang dengan `npm run build:demo`
if (fs.readFileSync(path.join(__dirname, 'docs', 'index.js'), 'utf8') !== fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')) {
  gagal++;
  console.error('GAGAL docs/index.js beda dengan index.js, jalankan: npm run build:demo');
}

if (gagal) {
  console.error(`\n${gagal} test gagal`);
  process.exit(1);
}
console.log(`OK: ${kasus.length + 2} kasus parse + formatter + sinkron demo`);
