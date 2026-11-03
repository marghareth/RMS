// FILE: src/lib/import-normalize.ts
//
// Tidies the usual ways a hand-filled census sheet differs from what the
// system stores, before a row is validated (src/lib/residentImport.ts):
//
//   Sex           "Male", "m", "Lalaki"           -> MALE
//   Civil status  "Married", "Live-in", "Kasal"   -> MARRIED, LIVE_IN
//   Birthdate     "03/15/1990", "March 15, 1990",
//                 "15 Mar 1990", "1990/3/15"      -> 1990-03-15
//   Purok         "  purok   1 " matches "Purok 1"; "1" also matches
//                 "Purok 1" and the other way round
//
// Anything it can't confidently read is passed through unchanged, so the
// row still fails validation with a clear message instead of being saved
// with a guess.
//
// Pure module: no Prisma, no Node APIs.

const SEX: Record<string, "MALE" | "FEMALE"> = {
  male: "MALE",
  m: "MALE",
  lalaki: "MALE",
  female: "FEMALE",
  f: "FEMALE",
  babae: "FEMALE",
};

const CIVIL_STATUS: Record<string, string> = {
  single: "SINGLE",
  s: "SINGLE",
  walang_asawa: "SINGLE",
  married: "MARRIED",
  m: "MARRIED",
  kasal: "MARRIED",
  widowed: "WIDOWED",
  widow: "WIDOWED",
  widower: "WIDOWED",
  w: "WIDOWED",
  balo: "WIDOWED",
  biyudo: "WIDOWED",
  biyuda: "WIDOWED",
  separated: "SEPARATED",
  hiwalay: "SEPARATED",
  live_in: "LIVE_IN",
  livein: "LIVE_IN",
  cohabiting: "LIVE_IN",
  common_law: "LIVE_IN",
};

/** "Live-in", "live in", "LIVE_IN" -> "live_in" */
function optionKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s\-.]+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizeSex(value: string | undefined): string | undefined {
  if (value == null) return value;
  return SEX[optionKey(value)] ?? value;
}

export function normalizeCivilStatus(value: string | undefined): string | undefined {
  if (value == null) return value;
  return CIVIL_STATUS[optionKey(value)] ?? value;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, enero: 1,
  feb: 2, february: 2, pebrero: 2,
  mar: 3, march: 3, marso: 3,
  apr: 4, april: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, hunyo: 6,
  jul: 7, july: 7, hulyo: 7,
  aug: 8, august: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, setyembre: 9,
  oct: 10, october: 10, oktubre: 10,
  nov: 11, november: 11, nobyembre: 11,
  dec: 12, december: 12, disyembre: 12,
};

function isoIfReal(y: number, m: number, d: number): string | null {
  if (y < 100) y += y <= new Date().getFullYear() % 100 ? 2000 : 1900;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Reads the common ways a birthdate gets typed and returns YYYY-MM-DD.
 *
 * Slashed or dashed numbers are read month first (03/04/1990 is March 4),
 * the way dates are usually written on PH forms, unless the first number
 * can only be a day (15/03/1990 is 15 March).
 */
export function normalizeDate(value: string | undefined): string | undefined {
  if (value == null) return value;
  const v = value.trim().replace(/\s+/g, " ");
  if (v === "") return v;

  // 1990-03-15, 1990/3/15, 1990.03.15
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return isoIfReal(+m[1], +m[2], +m[3]) ?? value;

  // 03/15/1990, 15/03/1990, 3-15-90
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    const iso = a > 12 ? isoIfReal(y, b, a) : isoIfReal(y, a, b);
    return iso ?? value;
  }

  // March 15, 1990 / Mar. 15 1990
  m = v.match(/^([A-Za-z]+)\.? (\d{1,2}),? (\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return isoIfReal(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) ?? value;

  // 15 March 1990 / 15-Mar-1990
  m = v.match(/^(\d{1,2})[ -]([A-Za-z]+)\.?[\s,-]*(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return isoIfReal(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) ?? value;

  return value;
}

/** Lowercase, single spaces: the key puroks and household numbers are looked up by. */
export function lookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds a purok by name, forgiving capitals, extra spaces and a missing or
 * extra "Purok" in front ("1" finds "Purok 1"; "Purok Sampaguita" finds
 * "Sampaguita").
 */
export function findPurok(name: string, puroksByName: Map<string, number>): number | undefined {
  const key = lookupKey(name);
  const direct = puroksByName.get(key);
  if (direct !== undefined) return direct;
  const withoutPrefix = key.replace(/^purok\s*/, "");
  for (const [stored, id] of puroksByName) {
    if (stored.replace(/^purok\s*/, "") === withoutPrefix) return id;
  }
  return undefined;
}

/** "2026-03-15" from an Excel date cell, without slipping a day across time zones. */
export function excelDateToIso(d: Date): string {
  return new Date(d.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 10);
}