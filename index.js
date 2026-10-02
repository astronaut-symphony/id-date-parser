/**
 * id-date-parser
 * Parser & formatter tanggal Bahasa Indonesia (natural language), tanpa dependency.
 *
 * Import di project lain:
 *   const { parseTanggalID, formatTanggalID } = require('id-date-parser');
 *   // atau, kalau cuma copy folder ini ke project lain:
 *   const { parseTanggalID, formatTanggalID } = require('./id-date-parser');
 *
 * API utama:
 *   parseTanggalID(input, opts?)        -> Date | null
 *   parseTanggalIDDetail(input, opts?)  -> { date: Date|null, rule: string|null }
 *   formatTanggalID(date, opts?)        -> string
 *
 * opts.referenceDate (Date) bisa dipakai untuk override "hari ini" — berguna
 * untuk testing atau kalau server jalan di timezone berbeda.
 *
 * Lihat README.md untuk daftar lengkap format yang didukung.
 */

'use strict';

// ---------------------------------------------------------------------------
// Kamus
// ---------------------------------------------------------------------------

const BULAN = {
  januari: 0, jan: 0,
  februari: 1, feb: 1, pebruari: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agu: 7, agt: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11,
};

const HARI_INDEX = {
  minggu: 0, ahad: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5, "jum'at": 5, jumat2: 5,
  sabtu: 6,
};

const NAMA_BULAN_OUTPUT = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_HARI_OUTPUT = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

// ---------------------------------------------------------------------------
// Util tanggal
// ---------------------------------------------------------------------------

function tengahMalam(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function getToday(opts) {
  if (opts && opts.referenceDate instanceof Date && !isNaN(opts.referenceDate)) {
    return tengahMalam(opts.referenceDate);
  }
  return tengahMalam(new Date());
}

/**
 * Bikin Date dengan month index & day yang di-"clamp" (bukan overflow/rollover).
 * Contoh: tahun=2026, monthIndex=1 (Feb), day=30 -> 28 Feb 2026 (bukan lompat ke Maret).
 * monthIndex boleh di luar 0-11 (mis. -1 atau 13), akan dinormalisasi dulu.
 */
function buatTanggalClamped(tahun, monthIndex, day) {
  const y = tahun + Math.floor(monthIndex / 12);
  const m = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const d = Math.max(1, Math.min(day, lastDay));
  const result = new Date(y, m, d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Bikin Date presisi (tanpa clamp) — dipakai untuk tanggal eksplisit (25 September 2026). */
function buatTanggalStrict(tahun, monthIndex, day) {
  const d = new Date(tahun, monthIndex, day);
  if (d.getFullYear() !== tahun || d.getMonth() !== monthIndex || d.getDate() !== day) {
    return null; // tanggal tidak valid, mis. 31 Februari
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function tambahHari(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function tambahBulanClamped(base, n) {
  return buatTanggalClamped(base.getFullYear(), base.getMonth() + n, base.getDate());
}

function tambahTahunClamped(base, n) {
  return buatTanggalClamped(base.getFullYear() + n, base.getMonth(), base.getDate());
}

/**
 * Untuk input tanpa tahun eksplisit (mis. "12 jun", "22-1"): pakai tahun berjalan,
 * tapi kalau tanggal itu sudah lewat di tahun ini, otomatis maju ke tahun depan.
 * Contoh: hari ini 1 Oktober 2026, input "12 Maret" -> 12 Maret 2027 (bukan 2026, sudah lewat).
 */
function tanggalTahunMendatang(day, monthIndex, today) {
  let d = buatTanggalStrict(today.getFullYear(), monthIndex, day);
  if (!d) return null;
  if (d < today) {
    d = buatTanggalStrict(today.getFullYear() + 1, monthIndex, day);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Normalisasi input
// ---------------------------------------------------------------------------

function normalize(raw) {
  let s = raw.toLowerCase().trim();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/,/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // Buang kata pengantar umum: "pada tanggal 12", "di tanggal 12", "sekitar tanggal 12"
  s = s.replace(/^(pada|di|sekitar)\s+/, '');

  // Samakan singkatan/ejaan umum jadi satu bentuk baku
  // (pakai lookahead, bukan \b di akhir, supaya "tgl." tetap cocok sebelum spasi/akhir string)
  s = s.replace(/\btgl\.?(?=\s|$)/g, 'tanggal');
  s = s.replace(/\bbln\.?(?=\s|$)/g, 'bulan');
  s = s.replace(/\bthn\.?(?=\s|$)/g, 'tahun');
  s = s.replace(/\bmgg\.?(?=\s|$)/g, 'minggu');
  s = s.replace(/\byg\b/g, 'yang');
  s = s.replace(/\bkemaren\b/g, 'kemarin');
  s = s.replace(/\bbesok\b/g, 'besok'); // no-op, placeholder for future synonyms

  // Buang nama hari di depan string absolut: "senin 25 september 2026" -> "25 september 2026"
  const kataPertama = s.split(' ')[0];
  if (kataPertama in HARI_INDEX && s.split(' ').length > 1) {
    // Hanya buang kalau kata berikutnya terlihat seperti awal tanggal absolut (angka)
    const sisa = s.slice(kataPertama.length).trim();
    if (/^\d/.test(sisa)) s = sisa;
  }

  return s;
}

// ---------------------------------------------------------------------------
// Rule-rule parsing, dicoba berurutan (paling spesifik dulu)
// ---------------------------------------------------------------------------

const RULES = [];
function rule(name, fn) { RULES.push({ name, fn }); }

// -- 1. Kata kunci relatif tetap -------------------------------------------
const RELATIF_TETAP = {
  'hari ini': (t) => t,
  'sekarang': (t) => t,
  'besok': (t) => tambahHari(t, 1),
  'lusa': (t) => tambahHari(t, 2),
  'kemarin': (t) => tambahHari(t, -1),
  'kemarin lusa': (t) => tambahHari(t, -2),
};
rule('relatif-tetap', (s, ctx) => {
  if (Object.prototype.hasOwnProperty.call(RELATIF_TETAP, s)) {
    return RELATIF_TETAP[s](ctx.today);
  }
  return null;
});

// -- 2. "<angka> <satuan> lagi|lalu" & "se<satuan> lagi|lalu" ---------------
rule('n-satuan-relatif', (s, ctx) => {
  let m = s.match(/^(\d+)\s*(hari|minggu|bulan|tahun)\s+(lagi|yang lalu|lalu)$/);
  let jumlah;
  if (m) {
    jumlah = parseInt(m[1], 10);
  } else {
    m = s.match(/^se(hari|minggu|bulan|tahun)\s+(lagi|yang lalu|lalu)$/);
    if (!m) return null;
    jumlah = 1;
    m = [m[0], '1', m[1], m[2]];
  }
  const satuan = m[2];
  const arah = m[3].startsWith('lagi') ? 1 : -1;
  const n = jumlah * arah;
  switch (satuan) {
    case 'hari': return tambahHari(ctx.today, n);
    case 'minggu': return tambahHari(ctx.today, n * 7);
    case 'bulan': return tambahBulanClamped(ctx.today, n);
    case 'tahun': return tambahTahunClamped(ctx.today, n);
    default: return null;
  }
});

// -- 3. "minggu depan/lalu", "bulan depan/lalu", "tahun depan/lalu" (implisit 1) --
rule('satuan-depan-lalu', (s, ctx) => {
  const m = s.match(/^(minggu|bulan|tahun)\s+(depan|lalu|kemarin)$/);
  if (!m) return null;
  const satuan = m[1];
  const n = m[2] === 'depan' ? 1 : -1;
  switch (satuan) {
    case 'minggu': return tambahHari(ctx.today, n * 7);
    case 'bulan': return tambahBulanClamped(ctx.today, n);
    case 'tahun': return tambahTahunClamped(ctx.today, n);
    default: return null;
  }
});

// -- 4. Nama hari: "senin", "senin depan", "senin lalu/kemarin", "senin ini" --
rule('nama-hari', (s, ctx) => {
  const m = s.match(/^(minggu|ahad|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)(?:\s+(depan|lalu|kemarin|ini))?$/);
  if (!m) return null;
  const target = HARI_INDEX[m[1]];
  const mode = m[2] || 'bare';
  const todayIdx = ctx.today.getDay();

  if (mode === 'lalu' || mode === 'kemarin') {
    let diff = (todayIdx - target + 7) % 7;
    if (diff === 0) diff = 7;
    return tambahHari(ctx.today, -diff);
  }
  // 'depan', 'ini', atau bare: cari kemunculan terdekat (hari ini termasuk utk 'ini'/bare)
  let diff = (target - todayIdx + 7) % 7;
  if (mode === 'depan' && diff === 0) diff = 7;
  return tambahHari(ctx.today, diff);
});

// -- 5. "tanggal N ..." / "tgl N ..." (sudah dinormalisasi jadi "tanggal") --
rule('tanggal-n', (s, ctx) => {
  const m = s.match(/^tanggal\s+(\d{1,2})(?:\s+(.*))?$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (day < 1 || day > 31) return null;
  const suffix = (m[2] || '').trim();
  const today = ctx.today;

  if (suffix === '' || suffix === 'ini' || suffix === 'bulan ini') {
    return buatTanggalClamped(today.getFullYear(), today.getMonth(), day);
  }
  if (suffix === 'nanti') {
    let kandidat = buatTanggalClamped(today.getFullYear(), today.getMonth(), day);
    if (kandidat < today) {
      kandidat = buatTanggalClamped(today.getFullYear(), today.getMonth() + 1, day);
    }
    return kandidat;
  }
  if (suffix === 'bulan depan') {
    return buatTanggalClamped(today.getFullYear(), today.getMonth() + 1, day);
  }
  if (suffix === 'bulan lalu' || suffix === 'bulan kemarin') {
    return buatTanggalClamped(today.getFullYear(), today.getMonth() - 1, day);
  }
  if (suffix === 'tahun depan') {
    return buatTanggalClamped(today.getFullYear() + 1, today.getMonth(), day);
  }
  if (suffix === 'tahun lalu' || suffix === 'tahun kemarin') {
    return buatTanggalClamped(today.getFullYear() - 1, today.getMonth(), day);
  }
  // "tanggal 12 september" / "tanggal 12 september 2026"
  const m2 = suffix.match(/^([a-z]+)\.?(?:\s+(\d{4}))?$/);
  if (m2 && m2[1] in BULAN) {
    const tahun = m2[2] ? parseInt(m2[2], 10) : today.getFullYear();
    return buatTanggalClamped(tahun, BULAN[m2[1]], day);
  }
  return null;
});

// -- 6. Bare number: "12" -> tanggal 12 bulan ini ----------------------------
rule('angka-saja', (s, ctx) => {
  const m = s.match(/^(\d{1,2})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (day < 1 || day > 31) return null;
  return buatTanggalClamped(ctx.today.getFullYear(), ctx.today.getMonth(), day);
});

// -- 7. Awal/akhir bulan/tahun -----------------------------------------------
rule('awal-akhir', (s, ctx) => {
  const m = s.match(/^(awal|akhir)\s+(bulan|tahun)(?:\s+(ini|depan|lalu|kemarin))?$/);
  if (!m) return null;
  const posisi = m[1]; // awal | akhir
  const satuan = m[2]; // bulan | tahun
  const arahKata = m[3] || 'ini';
  const arah = arahKata === 'depan' ? 1 : (arahKata === 'ini' ? 0 : -1);
  const today = ctx.today;

  if (satuan === 'bulan') {
    const base = tambahBulanClamped(today, arah);
    const day = posisi === 'awal' ? 1 : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return buatTanggalClamped(base.getFullYear(), base.getMonth(), day);
  }
  // tahun
  const tahun = today.getFullYear() + arah;
  return posisi === 'awal'
    ? buatTanggalStrict(tahun, 0, 1)
    : buatTanggalStrict(tahun, 11, 31);
});

// -- 8. ISO: YYYY-MM-DD -------------------------------------------------------
rule('iso', (s) => {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  return buatTanggalStrict(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
});

// -- 9. Numerik DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ---------------------------
rule('numerik', (s) => {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  let tahun = parseInt(m[3], 10);
  if (tahun < 100) tahun += tahun < 50 ? 2000 : 1900;
  return buatTanggalStrict(tahun, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
});

// -- 10. "25 September 2026" / "25 Sep 2026" ---------------------------------
rule('nama-bulan-lengkap', (s) => {
  const m = s.match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (!m || !(m[2] in BULAN)) return null;
  return buatTanggalStrict(parseInt(m[3], 10), BULAN[m[2]], parseInt(m[1], 10));
});

// -- 11b. "12 jun", "23 oktober" (tanpa tahun) -------------------------------
// Tahun otomatis: tahun ini kalau belum lewat, tahun depan kalau sudah lewat.
rule('nama-bulan-tanpa-tahun', (s, ctx) => {
  const m = s.match(/^(\d{1,2})\s+([a-z]+)\.?$/);
  if (!m || !(m[2] in BULAN)) return null;
  return tanggalTahunMendatang(parseInt(m[1], 10), BULAN[m[2]], ctx.today);
});

// -- 11c. "22-1", "12/3", "23.10" (DD-MM tanpa tahun) ------------------------
// Sama: tahun otomatis maju kalau tanggalnya sudah lewat tahun ini.
rule('numerik-tanpa-tahun', (s, ctx) => {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if (!m) return null;
  const monthIndex = parseInt(m[2], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return tanggalTahunMendatang(parseInt(m[1], 10), monthIndex, ctx.today);
});

// -- 12. "September 2026" (tanpa tanggal -> tanggal 1) -----------------------
rule('bulan-tahun', (s) => {
  const m = s.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (!m || !(m[1] in BULAN)) return null;
  return buatTanggalStrict(parseInt(m[2], 10), BULAN[m[1]], 1);
});

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/**
 * @param {string} input
 * @param {{ referenceDate?: Date }} [opts]
 * @returns {{ date: Date|null, rule: string|null }}
 */
function parseTanggalIDDetail(input, opts) {
  if (typeof input !== 'string' || !input.trim()) return { date: null, rule: null };
  const s = normalize(input);
  const ctx = { today: getToday(opts) };
  for (const { name, fn } of RULES) {
    const hasil = fn(s, ctx);
    if (hasil instanceof Date && !isNaN(hasil)) {
      return { date: hasil, rule: name };
    }
  }
  return { date: null, rule: null };
}

/**
 * @param {string} input
 * @param {{ referenceDate?: Date }} [opts]
 * @returns {Date|null}
 */
function parseTanggalID(input, opts) {
  return parseTanggalIDDetail(input, opts).date;
}

/**
 * @param {Date} date
 * @param {{ withDay?: boolean }} [opts]
 * @returns {string}
 */
function formatTanggalID(date, opts = {}) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const { withDay = false } = opts;
  const inti = `${date.getDate()} ${NAMA_BULAN_OUTPUT[date.getMonth()]} ${date.getFullYear()}`;
  return withDay ? `${NAMA_HARI_OUTPUT[date.getDay()]}, ${inti}` : inti;
}

module.exports = {
  parseTanggalID,
  parseTanggalIDDetail,
  formatTanggalID,
};
