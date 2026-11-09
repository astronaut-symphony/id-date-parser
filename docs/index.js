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
 *   parseTanggalIDDetail(input, opts?)  -> { date: Date|null, rule: string|null, hasTime: boolean }
 *   formatTanggalID(date, opts?)        -> string   (opts: withDay, withTime)
 *
 * opts.referenceDate (Date) bisa dipakai untuk override "hari ini" — berguna
 * untuk testing atau kalau server jalan di timezone berbeda.
 *
 * Kalau input menyebut waktu ("besok jam 10", "lusa 3 sore", "senin pagi"), Date hasilnya
 * ikut membawa jam & menit dan hasTime = true. Tanpa keterangan waktu, jam = 00:00.
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
  // sampai 8 tahun ke depan supaya "29 februari" ketemu tahun kabisat berikutnya (celah maks. 8 tahun)
  for (let y = today.getFullYear(); y <= today.getFullYear() + 8; y++) {
    const d = buatTanggalStrict(y, monthIndex, day);
    if (d && d >= today) return d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Normalisasi input
// ---------------------------------------------------------------------------

// Singkatan & ejaan gaul -> bentuk baku. Kunci huruf kecil, kata utuh (bukan potongan kata).
const SINGKATAN = {
  // umum
  tgl: 'tanggal', bln: 'bulan', thn: 'tahun', mgg: 'minggu', pekan: 'minggu',
  hr: 'hari', hri: 'hari', dpn: 'depan', dpan: 'depan', depn: 'depan', kedepan: 'ke depan',
  lg: 'lagi', yg: 'yang', skrg: 'sekarang', skrng: 'sekarang', ntar: 'nanti',
  bsk: 'besok', besk: 'besok', lsa: 'lusa', kmrn: 'kemarin', kmaren: 'kemarin', kemaren: 'kemarin',
  ags: 'agustus', agst: 'agustus',
  // nama hari
  sen: 'senin', sel: 'selasa', rab: 'rabu', kam: 'kamis', jum: 'jumat', jmt: 'jumat', sab: 'sabtu',
  // waktu
  jm: 'jam', pkl: 'pukul', mlm: 'malam', mlam: 'malam', pg: 'pagi', pgi: 'pagi',
  sng: 'siang', sre: 'sore', sr: 'sore', ptg: 'petang', sbh: 'subuh',
};

function normalize(raw) {
  let s = raw.toLowerCase().trim();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/,/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // Buang kata pengantar umum: "pada tanggal 12", "di tanggal 12", "sekitar tanggal 12"
  s = s.replace(/^(pada|di|sekitar)\s+/, '');

  // Samakan singkatan/ejaan umum jadi satu bentuk baku (lihat SINGKATAN).
  // Pakai lookahead, bukan \b di akhir, supaya "tgl." tetap cocok sebelum spasi/angka/akhir string.
  s = s.replace(/\b([a-z]+)\.?(?=\s|\d|$)/g, (m, w) => SINGKATAN[w] || m);
  // Zona waktu (wib/wita/wit) dibuang, jam dianggap lokal.
  s = s.replace(/\b(?:wib|wita|wit)\b/g, '');

  return s.replace(/\s+/g, ' ').trim();
}

// Buang nama hari di depan string absolut: "senin 25 september 2026" -> "25 september 2026"
// (dipisah dari normalize() supaya "senin 8 pagi" tidak kehilangan "senin" sebelum waktunya dilepas)
function buangHariAbsolut(s) {
  const kataPertama = s.split(' ')[0];
  if (kataPertama in HARI_INDEX && s.split(' ').length > 1) {
    // Hanya buang kalau kata berikutnya terlihat seperti awal tanggal absolut (angka)
    const sisa = s.slice(kataPertama.length).trim();
    // ...dan bukan durasi ("rabu 2 minggu lagi" harus tetap utuh)
    if (/^\d/.test(sisa) && !/^\d+\s*(hari|minggu|bulan|tahun)\b/.test(sisa)) s = sisa;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Ekstraksi waktu: "jam 10", "pukul 14.30", "3 sore", "setengah 3", "malam", ...
// ---------------------------------------------------------------------------

// Jam default kalau cuma disebut periodenya ("besok pagi"). Ubah di sini kalau mau lain.
const PERIODE_JAM = {
  subuh: 4, pagi: 8, siang: 12, sore: 16, petang: 17, malam: 20,
  'tengah malam': 0, 'tengah hari': 12,
};
const PN = 'subuh|pagi|siang|sore|petang|malam';

/** Konversi jam gaya 12-jam + periode ke 24-jam: "3 sore" -> 15, "9 malam" -> 21, "12 malam" -> 0. */
function jamDariPeriode(h, periode) {
  if (!periode || h > 12) return h;
  switch (periode) {
    case 'siang': return h < 10 ? h + 12 : h;
    case 'sore': case 'petang': return h < 12 ? h + 12 : h;
    case 'malam': return h === 12 ? 0 : (h >= 5 ? h + 12 : h);
    default: return h === 12 ? 0 : h; // pagi, subuh
  }
}

// Dicoba berurutan. "10.30" tanpa jam/periode sengaja bukan waktu: bentrok dengan tanggal (23.10).
const POLA_WAKTU = [
  // "jam setengah 3 sore", "setengah 12 malam" (= setengah jam sebelum jam N)
  { sete: true, re: new RegExp(String.raw`(?:\b(?:pada|sekitar)\s+)?(?:\b(?:jam|pukul)\s*)?\bsetengah\s+(?<h>\d{1,2})(?:\s*(?<p>${PN}))?(?![\d:.])`) },
  // "jam 10", "pukul 10.30", "jam 8 pagi"
  { re: new RegExp(String.raw`(?:\b(?:pada|sekitar)\s+)?\b(?:jam|pukul)\s*(?<h>\d{1,2})(?:[.:](?<m>\d{2}))?(?:\s*(?<p>${PN}))?(?![\d:.])`) },
  // "10:30", "10:30 malam"
  { re: new RegExp(String.raw`(?<![\d.:/-])(?<h>\d{1,2}):(?<m>\d{2})(?::\d{2})?(?:\s*(?<p>${PN}))?(?![\d:.])`) },
  // "10.30 malam"
  { re: new RegExp(String.raw`(?<![\d.:/-])(?<h>\d{1,2})\.(?<m>\d{2})\s*(?<p>${PN})\b`) },
  // "3 sore" (tapi bukan "tanggal 12 malam")
  { re: new RegExp(String.raw`(?<![\d.:/-]|tanggal\s)(?<h>\d{1,2})\s*(?<p>${PN})\b`) },
  // "pagi", "malam ini", "tengah malam"
  { re: new RegExp(String.raw`\b(?<p>tengah malam|tengah hari|${PN})\b(?:\s+(?:ini|nanti))?`) },
];

/**
 * @returns {null | {invalid: true} | {sisa: string, jam: number, menit: number}}
 *   sisa = input tanpa bagian waktu, untuk diparse sebagai tanggal.
 */
function ekstrakWaktu(s) {
  for (const { re, sete } of POLA_WAKTU) {
    const m = re.exec(s);
    if (!m) continue;
    const g = m.groups;
    let jam;
    let menit = 0;
    if (g.h === undefined) {
      jam = PERIODE_JAM[g.p];
    } else {
      const h = parseInt(g.h, 10);
      menit = g.m ? parseInt(g.m, 10) : 0;
      if (h > 23 || menit > 59) return { invalid: true };
      jam = jamDariPeriode(h, g.p);
      if (sete) { jam = (jam + 23) % 24; menit = 30; }
    }
    const sisa = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`.replace(/\s+/g, ' ').trim();
    return { sisa, jam, menit };
  }
  return null;
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

// -- 2. "<angka> <satuan> lagi|ke depan|lalu" & "se<satuan> ..." ----------------
rule('n-satuan-relatif', (s, ctx) => {
  let m = s.match(/^(\d+)\s*(hari|minggu|bulan|tahun)\s+(lagi|ke depan|yang lalu|lalu)$/);
  let jumlah;
  if (m) {
    jumlah = parseInt(m[1], 10);
  } else {
    m = s.match(/^se(hari|minggu|bulan|tahun)\s+(lagi|ke depan|yang lalu|lalu)$/);
    if (!m) return null;
    jumlah = 1;
    m = [m[0], '1', m[1], m[2]];
  }
  const satuan = m[2];
  const arah = /^(lagi|ke)/.test(m[3]) ? 1 : -1;
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
  const m = s.match(/^(?:hari\s+)?(minggu|ahad|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)(?:\s+(depan|lalu|kemarin|ini))?$/);
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

// -- 4b. Hari di pekan tertentu: "senin minggu depan", "jumat minggu ini" (pekan mulai Senin)
rule('hari-minggu-ke', (s, ctx) => {
  const m = s.match(/^(?:hari\s+)?(minggu|ahad|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)\s+minggu\s+(depan|ini|lalu|kemarin)$/);
  if (!m) return null;
  const k = m[2] === 'depan' ? 1 : (m[2] === 'ini' ? 0 : -1);
  const seninIni = tambahHari(ctx.today, -((ctx.today.getDay() + 6) % 7));
  return tambahHari(seninIni, k * 7 + (HARI_INDEX[m[1]] + 6) % 7);
});

// -- 4b'. Hari di pekan N minggu dari sekarang: "rabu 2 minggu lagi", "senin seminggu lalu"
// Artinya hari itu di pekan (mulai Senin) tempat "hari ini + N minggu" jatuh.
rule('hari-n-minggu', (s, ctx) => {
  const m = s.match(/^(?:hari\s+)?(minggu|ahad|senin|selasa|rabu|kamis|jumat|jum'at|sabtu)\s+(?:(\d+)\s*|se)minggu\s+(lagi|ke depan|yang lalu|lalu)$/);
  if (!m) return null;
  const k = (m[2] ? parseInt(m[2], 10) : 1) * (/^(lagi|ke)/.test(m[3]) ? 1 : -1);
  const seninIni = tambahHari(ctx.today, -((ctx.today.getDay() + 6) % 7));
  return tambahHari(seninIni, k * 7 + (HARI_INDEX[m[1]] + 6) % 7);
});

// -- 4c. Hari tetap tiap tahun: "natal", "tahun baru", "kemerdekaan" (hari libur yang bergeser tidak didukung)
const HARI_TETAP = { natal: [11, 25], 'tahun baru': [0, 1], kemerdekaan: [7, 17] };
rule('hari-tetap', (s, ctx) => {
  const m = s.match(/^(?:hari\s+)?(natal|tahun baru|kemerdekaan)$/);
  if (!m) return null;
  const [monthIndex, day] = HARI_TETAP[m[1]];
  return tanggalTahunMendatang(day, monthIndex, ctx.today);
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
    return buatTanggalStrict(tahun, BULAN[m2[1]], day); // eksplisit: 31 april / 29 feb non-kabisat -> null
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
// Fallback typo: "senn" -> "senin" (hanya salah/kurang/lebih/tertukar huruf sedikit)
// ---------------------------------------------------------------------------

const KOSAKATA = [
  ...Object.keys(BULAN), ...Object.keys(HARI_INDEX),
  'besok', 'lusa', 'kemarin', 'sekarang', 'hari', 'ini', 'depan', 'minggu', 'bulan', 'tahun', 'lagi', 'lalu',
  'nanti', 'tanggal', 'awal', 'akhir', 'yang', 'jam', 'pukul', 'setengah', 'tengah', 'subuh', 'pagi', 'siang',
  'sore', 'petang', 'malam', 'natal', 'kemerdekaan', 'baru',
].filter((w) => /^[a-z]+$/.test(w));
const KATA_VALID = new Set([...KOSAKATA, ...Object.keys(SINGKATAN), 'ke', 'pada', 'sekitar']);

/** Damerau-Levenshtein (dua huruf bertukar = 1 edit). */
function jarakEdit(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Ganti kata asing dengan kata kamus yang paling mirip. Kata <4 huruf tidak disentuh (terlalu ambigu);
 * toleransi 1 edit (2 edit untuk kata >=8 huruf). Kalau ada dua kandidat sama dekat, kata dibiarkan.
 * @returns {{ teks: string, koreksi: {from: string, to: string}[] }}
 */
function perbaikiTypo(s) {
  const koreksi = [];
  const teks = s.split(' ').map((kata) => {
    if (kata.length < 4 || !/^[a-z]+$/.test(kata) || KATA_VALID.has(kata)) return kata;
    const maks = kata.length >= 8 ? 2 : 1;
    let terbaik = null;
    let jarakMin = maks + 1;
    let seri = false;
    for (const kandidat of KOSAKATA) {
      if (Math.abs(kandidat.length - kata.length) > maks) continue;
      const j = jarakEdit(kata, kandidat);
      if (j < jarakMin) { jarakMin = j; terbaik = kandidat; seri = false; }
      else if (j === jarakMin && kandidat !== terbaik) seri = true;
    }
    if (!terbaik || seri) return kata;
    koreksi.push({ from: kata, to: terbaik });
    return terbaik;
  }).join(' ');
  return { teks, koreksi };
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/** Parse teks yang sudah dinormalisasi. Balikin { date, rule, hasTime }; date null kalau tidak cocok. */
function parseNormalized(mentah, ctx) {
  const gagal = { date: null, rule: null, hasTime: false };
  const waktu = ekstrakWaktu(mentah);
  if (waktu && waktu.invalid) return gagal;
  const s = buangHariAbsolut(waktu ? waktu.sisa : mentah);

  let date = null;
  let namaRule = null;
  if (waktu && s === '') {
    date = ctx.today; // cuma waktu ("jam 10", "malam ini") -> hari ini
    namaRule = 'waktu-saja';
  } else {
    for (const { name, fn } of RULES) {
      const hasil = fn(s, ctx);
      if (hasil instanceof Date && !isNaN(hasil)) { date = hasil; namaRule = name; break; }
    }
  }
  if (!date) return gagal;
  if (!waktu) return { date, rule: namaRule, hasTime: false };
  const dt = new Date(date);
  dt.setHours(waktu.jam, waktu.menit, 0, 0);
  return { date: dt, rule: namaRule, hasTime: true };
}

/**
 * @param {string} input
 * @param {{ referenceDate?: Date, fuzzy?: boolean }} [opts]  fuzzy (default true): coba perbaiki typo kalau parse gagal
 * @returns {{ date: Date|null, rule: string|null, hasTime: boolean, assumed: boolean, corrections: {from: string, to: string}[] }}
 *   assumed = true berarti hasilnya tebakan setelah typo diperbaiki (lihat corrections).
 */
function parseTanggalIDDetail(input, opts) {
  const gagal = { date: null, rule: null, hasTime: false, assumed: false, corrections: [] };
  if (typeof input !== 'string' || !input.trim()) return gagal;
  const ctx = { today: getToday(opts) };
  const mentah = normalize(input);

  const hasil = parseNormalized(mentah, ctx);
  if (hasil.date) return { ...hasil, assumed: false, corrections: [] };

  if (opts && opts.fuzzy === false) return gagal;
  const { teks, koreksi } = perbaikiTypo(mentah);
  if (!koreksi.length) return gagal;
  const tebakan = parseNormalized(teks, ctx);
  return tebakan.date ? { ...tebakan, assumed: true, corrections: koreksi } : gagal;
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
 * @param {{ withDay?: boolean, withTime?: boolean }} [opts]
 * @returns {string}
 */
function formatTanggalID(date, opts = {}) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const { withDay = false, withTime = false } = opts;
  let hasil = `${date.getDate()} ${NAMA_BULAN_OUTPUT[date.getMonth()]} ${date.getFullYear()}`;
  if (withDay) hasil = `${NAMA_HARI_OUTPUT[date.getDay()]}, ${hasil}`;
  if (withTime) {
    const p = (n) => String(n).padStart(2, '0');
    hasil += ` pukul ${p(date.getHours())}.${p(date.getMinutes())}`;
  }
  return hasil;
}

const api = { parseTanggalID, parseTanggalIDDetail, formatTanggalID };

// CommonJS (Node) atau <script> biasa di browser (demo di docs/) -> window.IdDateParser
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else window.IdDateParser = api;
