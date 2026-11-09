# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), versi mengikuti [SemVer](https://semver.org/).

## [1.3.0] - 2026-11-09

### Added
- Format `<hari> <N> minggu lagi/lalu` (mis. `rabu 2 minggu lagi`): hari itu di pekan tempat "hari ini + N minggu" jatuh.

### Changed
- `engines.node` naik dari `>=12` ke `>=18` (sesuai versi yang diuji di CI).

### Fixed
- Nama hari di depan durasi (`rabu 2 minggu lagi`) tidak lagi dibuang saat normalisasi.

## [1.2.0] - 2026-11-09

### Added
- Singkatan umum: `hr`, `dpn`, `lg`, `bsk`, `lsa`, `kmrn`, `skrg`, `ntar`, `ags`, `sen`/`sel`/`rab`/`kam`/`jum`/`sab`, dan lainnya.
- Fallback typo: input yang gagal di-parse diperbaiki bila hanya beda 1 huruf (2 untuk kata 8 huruf ke atas) dan ditandai `assumed: true` beserta `corrections`. Bisa dimatikan dengan `{ fuzzy: false }`.

## [1.1.0] - 2026-11-09

### Added
- Waktu: `jam 10`, `pukul 14.30`, `10:30`, `3 sore`, `jam setengah 3`, `besok pagi`, dst. Hasil membawa jam & menit, `hasTime` pada `parseTanggalIDDetail`, dan opsi `withTime` pada `formatTanggalID`.
- Singkatan waktu (`jm`, `mlm`, `pg`, `sre`, ...).
- Pola `pekan depan`, `hari senin`, `3 hari ke depan`, `senin minggu depan`, `natal`, `tahun baru`, `kemerdekaan`.
- Tipe TypeScript (`index.d.ts`), CI GitHub Actions, dan test dengan assertion.

### Changed
- `tanggal 29 februari` dan tanggal eksplisit lain yang tidak valid kini `null` (sebelumnya di-clamp). `29 februari` tanpa tahun mencari tahun kabisat berikutnya.
- Demo memakai `index.js` yang sama dengan package (lewat `docs/index.js`).

## [1.0.0]

- Rilis awal: parser & formatter tanggal Bahasa Indonesia tanpa dependency.
