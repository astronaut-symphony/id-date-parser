# id-date-parser

Parser & formatter tanggal Bahasa Indonesia, natural language, tanpa dependency.

**[Coba demo-nya](https://astronaut-symphony.github.io/id-date-parser/docs/)**

## Install

**Cara 1 — npm install dari GitHub** (direkomendasikan, gampang di-update)

```bash
npm install github:astronaut-symphony/id-date-parser
```

```js
const { parseTanggalID, formatTanggalID } = require('id-date-parser');
```

**Cara 2 — copy manual**

Copy folder `id-date-parser/` ke dalam project kamu (mis. ke `libs/`), lalu require pakai path relatif:

```js
const { parseTanggalID, formatTanggalID } = require('./libs/id-date-parser');

parseTanggalID('tanggal 12 bulan depan'); // -> Date
parseTanggalID('besok');                  // -> Date (hari ini + 1)
parseTanggalID('teks ngaco');             // -> null

formatTanggalID(new Date(2026, 8, 25));   // -> "25 September 2026"
```

Cara 1 ke-track di `package.json`, tinggal `npm update` kalau ada perubahan di repo.
Cara 2 manual — kalau ada update, folder-nya harus di-copy ulang sendiri.

Butuh override "hari ini" (buat testing, dll)? Pakai `opts.referenceDate`:

```js
parseTanggalID('besok', { referenceDate: new Date(2026, 0, 1) });
```

Mau tau rule mana yang match? Pakai `parseTanggalIDDetail(input)` -> `{ date, rule }`.

## Contoh format yang dikenali

| Kategori | Contoh |
|---|---|
| Relatif | `hari ini`, `besok`, `lusa`, `kemarin`, `3 hari lagi`, `2 minggu lalu` |
| Satuan depan/lalu | `minggu depan`, `bulan lalu`, `tahun depan` |
| Nama hari | `senin`, `senin depan`, `jumat lalu`, `ahad` |
| Tanggal spesifik | `tanggal 12`, `tgl 21`, `tanggal 12 nanti`, `tanggal 12 bulan depan/lalu` |
| Awal/akhir | `akhir bulan`, `awal bulan depan`, `akhir tahun` |
| Tanpa tahun | `12 jun`, `22-1` -> otomatis pilih tahun depan kalau sudah lewat tahun ini |
| Format baku | `25 September 2026`, `25/09/2026`, `2026-09-25` |

Input yang nggak valid (`31 Februari 2026`, `tanggal 40`) balikin `null`.

Daftar lengkap & detail logiknya ada sebagai komentar di `index.js` (array `RULES`,
tinggal tambah `rule('nama', fn)` baru kalau mau nambah pola).

## Test

```bash
node test.js
```