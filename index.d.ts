export interface ParseOptions {
  /** Override "hari ini" (default: new Date()). */
  referenceDate?: Date;
  /** Coba perbaiki typo kecil kalau parse gagal (default true). */
  fuzzy?: boolean;
}

export interface ParseDetail {
  date: Date | null;
  /** Nama rule yang cocok, null kalau tidak valid. */
  rule: string | null;
  /** true kalau input menyebut jam/periode (pagi, siang, ...). */
  hasTime: boolean;
  /** true kalau hasilnya tebakan setelah typo diperbaiki; lihat `corrections`. */
  assumed: boolean;
  /** Kata yang diperbaiki, mis. [{ from: 'senn', to: 'senin' }]. Kosong kalau tidak ada. */
  corrections: { from: string; to: string }[];
}

export interface FormatOptions {
  /** Awali dengan nama hari: "Jumat, 25 September 2026". */
  withDay?: boolean;
  /** Tambahkan " pukul HH.mm". */
  withTime?: boolean;
}

export function parseTanggalID(input: string, opts?: ParseOptions): Date | null;
export function parseTanggalIDDetail(input: string, opts?: ParseOptions): ParseDetail;
export function formatTanggalID(date: Date, opts?: FormatOptions): string;
