# id-date-parser

Parser & formatter tanggal Bahasa Indonesia dari teks natural (`besok jam 10 malam`, `senin depan`, `tgl 12 bln dpn`), tanpa dependency. Mengenali singkatan umum, jam/periode, dan memperbaiki typo kecil.

**[Coba demo-nya](https://astronaut-symphony.github.io/id-date-parser/)**

## Instalasi

**Cara 1 — npm install dari GitHub** (direkomendasikan, gampang di-update)

```bash
npm install github:astronaut-symphony/id-date-parser
```

```js
const { parseTanggalID, parseTanggalIDDetail, formatTanggalID } = require('id-date-parser');

parseTanggalID('tanggal 12 bulan depan'); // -> Date
parseTanggalID('besok');                  // -> Date (hari ini + 1)
parseTanggalID('teks ngaco');             // -> null

formatTanggalID(new Date(2026, 8, 25));                    // "25 September 2026"
formatTanggalID(new Date(2026, 8, 25), { withDay: true }); // "Jumat, 25 September 2026"
```

**Cara 2 — copy manual**

Copy folder `id-date-parser/` ke project kamu (mis. ke `libs/`), lalu `require('./libs/id-date-parser')`.
Kalau ada update, folder-nya harus di-copy ulang sendiri. Cara 1 cukup `npm update`.

**Opsi**

| Opsi | Fungsi |
|---|---|
| `referenceDate` | Override "hari ini" (buat testing, atau server beda timezone): `parseTanggalID('besok', { referenceDate: new Date(2026, 0, 1) })` |
| `fuzzy` | `false` untuk mematikan perbaikan typo (default `true`), lihat [Typo](#typo) |

`parseTanggalIDDetail(input, opts)` mengembalikan info lengkap:
`{ date, rule, hasTime, assumed, corrections }` (`rule` = nama rule yang cocok). Tipe TypeScript ada di `index.d.ts`.

## Format yang dikenali

| Kategori | Contoh |
|---|---|
| Relatif | `hari ini`, `besok`, `lusa`, `kemarin`, `3 hari lagi`, `3 hari ke depan`, `2 minggu lalu` |
| Satuan depan/lalu | `minggu depan`, `pekan depan`, `bulan lalu`, `tahun depan` |
| Nama hari | `senin`, `hari senin`, `senin depan`, `jumat lalu`, `ahad` |
| Hari di pekan tertentu | `senin minggu depan`, `jumat minggu ini`, `rabu 2 minggu lagi` (pekan mulai Senin) |
| Hari tetap | `natal`, `tahun baru`, `kemerdekaan` (libur yang bergeser, mis. Lebaran, tidak didukung) |
| Tanggal spesifik | `tanggal 12`, `tgl 21`, `tanggal 12 nanti`, `tanggal 12 bulan depan/lalu` |
| Awal/akhir | `akhir bulan`, `awal bulan depan`, `akhir tahun` |
| Tanpa tahun | `12 jun`, `22-1` (otomatis tahun depan kalau sudah lewat tahun ini) |
| Format baku | `25 September 2026`, `25/09/2026`, `2026-09-25` |

Tanggal eksplisit yang nggak valid (`31 Februari 2026`, `tanggal 40`, `tanggal 29 februari` di tahun non-kabisat) balikin `null`.
Hasil relatif justru di-*clamp* ke akhir bulan: `1 bulan lagi` dari 31 Januari -> 28 Februari.

`rabu 2 minggu lagi` artinya hari Rabu di pekan tempat "hari ini + 2 minggu" jatuh (pekan mulai Senin).
Misalnya dari Senin, 9 November 2026 hasilnya Rabu, 25 November 2026.

<details>
<summary>Daftar rule yang diterima</summary>

Nama rule muncul di `rule` pada hasil `parseTanggalIDDetail`. Dicoba berurutan dari atas, yang pertama cocok dipakai.
Input sudah di-lowercase dan singkatannya dibakukan sebelum dicocokkan (lihat [Singkatan](#singkatan)).

| Rule | Pola | Contoh |
|---|---|---|
| `relatif-tetap` | `hari ini`, `sekarang`, `besok`, `lusa`, `kemarin`, `kemarin lusa` | `lusa` |
| `n-satuan-relatif` | `<N\|se> <hari\|minggu\|bulan\|tahun> <lagi\|ke depan\|lalu\|yang lalu>` | `3 hari lagi`, `seminggu ke depan` |
| `satuan-depan-lalu` | `<minggu\|bulan\|tahun> <depan\|lalu>` | `bulan depan` |
| `nama-hari` | `[hari] <nama hari> [depan\|lalu\|ini]` | `senin lalu`, `hari jumat` |
| `hari-minggu-ke` | `<nama hari> minggu <depan\|ini\|lalu>` | `senin minggu depan` |
| `hari-n-minggu` | `<nama hari> <N\|se>minggu <lagi\|ke depan\|lalu>` | `rabu 2 minggu lagi` |
| `hari-tetap` | `natal`, `tahun baru`, `kemerdekaan` | `hari natal` |
| `tanggal-n` | `tanggal N [ini\|nanti\|bulan depan\|bulan lalu\|tahun depan\|<bulan> [tahun]]` | `tgl 12 bulan depan` |
| `angka-saja` | `N` (tanggal bulan ini) | `12` |
| `awal-akhir` | `<awal\|akhir> <bulan\|tahun> [ini\|depan\|lalu]` | `akhir bulan depan` |
| `iso` | `YYYY-MM-DD` | `2026-09-25` |
| `numerik` | `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY` | `25/09/2026` |
| `nama-bulan-lengkap` | `DD <bulan> YYYY` | `25 Sep 2026` |
| `nama-bulan-tanpa-tahun` | `DD <bulan>` (tahun otomatis) | `12 jun` |
| `numerik-tanpa-tahun` | `DD/MM`, `DD-MM`, `DD.MM` (tahun otomatis) | `22-1` |
| `bulan-tahun` | `<bulan> YYYY` (tanggal 1) | `September 2026` |
| `waktu-saja` | cuma [waktu](#waktu), tanpa tanggal (hari ini) | `jam 10`, `malam ini` |

Semua rule di atas bisa diikuti keterangan [waktu](#waktu), dan nama hari di depan tanggal baku diabaikan
(`Senin, 25 September 2026`).

</details>

## Waktu

Tambahkan jam atau periode (pagi/siang/sore/malam) ke ekspresi tanggal apa pun. `Date` hasilnya ikut membawa jam & menit
dan `hasTime` bernilai `true`. Tanpa keterangan waktu, jamnya `00:00` dan `hasTime` `false`.

```js
const { date, hasTime } = parseTanggalIDDetail('besok jm 9 mlm');
formatTanggalID(date, { withDay: true, withTime: hasTime });
// "Sabtu, 26 September 2026 pukul 21.00"
```

Contoh (hari ini = Jumat, 25 September 2026):

| Input | Hasil |
|---|---|
| `besok jam 10` | Sabtu, 26 September 2026 pukul 10.00 |
| `lusa 3 sore` | Minggu, 27 September 2026 pukul 15.00 |
| `besok jm 9 mlm` | Sabtu, 26 September 2026 pukul 21.00 |
| `besok pagi` | Sabtu, 26 September 2026 pukul 08.00 |
| `senin depan jam setengah 3 sore` | Senin, 28 September 2026 pukul 14.30 |

Jam 12-jam dikonversi sesuai periode (`3 sore` = 15.00, `9 malam` = 21.00, `12 malam` = 00.00 hari itu).
Kalau cuma periode yang disebut, jam defaultnya (ubah di `PERIODE_JAM` pada `index.js`):

| Periode | Jam | Periode | Jam |
|---|---|---|---|
| `subuh` | 04.00 | `petang` | 17.00 |
| `pagi` | 08.00 | `malam` | 20.00 |
| `siang` | 12.00 | `tengah malam` | 00.00 |
| `sore` | 16.00 | `tengah hari` | 12.00 |

Catatan:
- Akhiran `WIB`/`WITA`/`WIT` diabaikan (jam dianggap lokal).
- Jam di luar 0-23 atau menit di atas 59 -> `null`.
- `10.30` tanpa `jam`/periode **tidak** dianggap waktu karena bentrok dengan tanggal (`23.10` = 23 Oktober). Pakai `10:30` atau `jam 10.30`.

## Singkatan

Singkatan umum dikenali seperti kata biasa dan bisa dicampur: `3 hr lg`, `minggu dpn`, `sel dpn`, `tgl 12 bln dpn`, `bsk jm 9 mlm`.

<details>
<summary>Daftar singkatan yang diterima</summary>

| Singkatan | Artinya |
|---|---|
| `hr`, `hri` | hari |
| `dpn`, `dpan`, `depn`, `kedepan` | depan, ke depan |
| `lg` | lagi |
| `yg` | yang |
| `tgl` | tanggal |
| `bln` | bulan |
| `thn` | tahun |
| `mgg`, `pekan` | minggu |
| `bsk`, `besk` | besok |
| `lsa` | lusa |
| `kmrn`, `kmaren`, `kemaren` | kemarin |
| `skrg`, `skrng` | sekarang |
| `ntar` | nanti |
| `sen` | senin |
| `sel` | selasa |
| `rab` | rabu |
| `kam` | kamis |
| `jum`, `jmt` | jumat |
| `sab` | sabtu |
| `ags`, `agst` | agustus |
| `jm` | jam |
| `pkl` | pukul |
| `pg`, `pgi` | pagi |
| `sng` | siang |
| `sre`, `sr` | sore |
| `ptg` | petang |
| `mlm`, `mlam` | malam |
| `sbh` | subuh |

Nama bulan juga bisa disingkat: `jan`, `feb`, `mar`, `apr`, `jun`, `jul`, `agu`/`agt`, `sep`/`sept`, `okt`, `nov`, `des`.
Sumber lengkapnya ada di `SINGKATAN` dan `BULAN` pada `index.js`.

</details>

## Typo

Kalau input **tidak bisa di-parse**, parser mencoba memperbaiki typo kecil (huruf salah, kurang, lebih, atau tertukar)
dan memakai hasilnya sebagai **asumsi**:

```js
parseTanggalIDDetail('senn');
// { date: <Senin terdekat>, rule: 'nama-hari', hasTime: false,
//   assumed: true, corrections: [{ from: 'senn', to: 'senin' }] }
```

| Input | Dianggap |
|---|---|
| `senn`, `senen depan` | `senin`, `senin depan` |
| `bsok jam 10` | `besok jam 10` |
| `mingu depan` | `minggu depan` |
| `25 septembr 2026` | `25 september 2026` |

- `assumed: true` = hasil tebakan, sebaiknya dikonfirmasi ke user. Input yang valid selalu `assumed: false`.
- Batas: kata minimal 4 huruf, toleransi 1 huruf (2 untuk kata 8 huruf ke atas). Kalau ada dua kandidat sama dekat, kata dibiarkan.
  Jadi `sor` tidak ditebak, sedangkan `soore` -> `sore`.
- `parseTanggalID` (yang cuma balikin `Date`) ikut memakai tebakan. Pakai `parseTanggalIDDetail` kalau perlu tahu, atau matikan dengan `{ fuzzy: false }`.

## Kontribusi

Kontribusi sangat diterima: pola baru, singkatan yang belum ada, atau laporan input yang salah di-parse.

1. Fork repo ini, lalu `npm test` untuk memastikan semuanya hijau.
2. Tambahkan perubahan di `index.js`:
   - pola tanggal baru: `rule('nama', fn)` di array `RULES` (dicoba berurutan, paling spesifik dulu);
   - singkatan baru: satu baris di `SINGKATAN`.
3. Tambahkan kasus di `test.js` (`[input, 'YYYY-MM-DD']` atau `'YYYY-MM-DD HH:mm'`, referensi hari ini = 25 September 2026).
4. Jalankan `npm run build:demo` (menyalin `index.js` ke `docs/index.js` untuk demo), lalu `npm test`.
5. Buka pull request dengan contoh input dan hasil yang diharapkan.

Menemukan bug? Buka [issue](https://github.com/astronaut-symphony/id-date-parser/issues) berisi input, hasil yang didapat, dan hasil yang diharapkan.

Lisensi: MIT.
