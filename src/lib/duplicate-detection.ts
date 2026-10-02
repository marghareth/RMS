// FILE: src/lib/duplicate-detection.ts
//
// ONE implementation of "is this resident already in the system?", shared by
// the manual "Add Resident" API, the household form's pre-check, and the
// CSV/Excel import (preview + commit). Before this, each of those had its own
// copy of the same rule — fname + lname + birthdate, case-insensitive — which
// caught only perfect repeats: "Jose Dela Cruz" vs "José Dela-Cruz",
// "Cruz, Juan" typed as "Juan Cruz" the wrong way round, "Jon" vs "John" or a
// birthdate off by one digit all slipped through as brand-new people.
//
// Two outcomes:
//   EXACT     the same person after normalization. HARD BLOCK — never saved.
//   POSSIBLE  probably the same person but not certain. WARNING — the user
//             sees which record it resembles and may confirm to save anyway.
//
// POSSIBLE reasons (each requires the rest of the identity to agree, which
// keeps false alarms rare):
//   SWAPPED_NAMES   first and last name exchanged, same birthdate
//   NAME_TYPO       exactly one letter added/dropped/changed/transposed
//                   across first+last name, same birthdate
//   BIRTHDATE_TYPO  same name, birthdate differs by a likely typing slip
//                   (month/day swapped, one digit wrong, two digits swapped)
//
// Pure module: no Prisma client, no I/O, so it is trivial to unit test and
// safe to import anywhere. (Only a *type* import from Prisma, for the SQL
// pre-filter helper at the bottom.)

import type { Prisma } from "@prisma/client";

// ─── types ─────────────────────────────────────────────────────────────────

/** The fields identity is judged on. Works for DB rows and for parsed input. */
export type ResidentIdentity = {
  fname: string;
  lname: string;
  mname?: string | null;
  name_extension?: string | null;
  birthdate: Date | string;
};

export type DuplicateLevel = "EXACT" | "POSSIBLE";
export type DuplicateReason = "EXACT" | "SWAPPED_NAMES" | "NAME_TYPO" | "BIRTHDATE_TYPO";

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  EXACT: "Same name and birthdate",
  SWAPPED_NAMES: "First and last name look swapped",
  NAME_TYPO: "Name differs by one letter (same birthdate)",
  BIRTHDATE_TYPO: "Same name, birthdate differs by a likely typo",
};

// Strongest first — used to sort hits and to keep only the best per record.
const REASON_PRIORITY: DuplicateReason[] = ["EXACT", "SWAPPED_NAMES", "NAME_TYPO", "BIRTHDATE_TYPO"];

export type DuplicateHit<T extends ResidentIdentity> = {
  record: T;
  level: DuplicateLevel;
  reason: DuplicateReason;
  label: string;
};

/** JSON-safe summary of a hit, for API responses. */
export type DuplicateMatchInfo = {
  id: number | null;
  fname: string;
  lname: string;
  mname: string | null;
  birthdate: string; // YYYY-MM-DD
  level: DuplicateLevel;
  reason: DuplicateReason;
  label: string;
  /** Set when the match is an earlier ROW of the same import file, not a stored resident. */
  rowNumber?: number;
};

// ─── normalization ─────────────────────────────────────────────────────────

/**
 * Lower-cased, accent-free, punctuation-free, single-spaced.
 *   "  José   Dela-Cruz Jr. " -> "jose dela cruz jr"
 */
export function normalizeName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (é -> e, ñ -> n)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation / symbols -> space
    .trim();
}

/**
 * Normalized AND with spaces removed, so spacing differences can't hide a
 * match: "De la Cruz" = "Dela Cruz" = "Delacruz" = "Dela-Cruz".
 */
export function nameKey(value: string | null | undefined): string {
  return normalizeName(value).replace(/ /g, "");
}

/** YYYY-MM-DD from a Date (UTC) or a string that starts with one. */
export function birthdateISO(value: Date | string): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

// ─── fuzzy helpers ─────────────────────────────────────────────────────────

/**
 * Optimal-string-alignment edit distance: insertions, deletions,
 * substitutions and adjacent transpositions each cost 1 ("Jhon" -> "John"
 * is 1, not 2). Gives up early and returns max+1 when it can't be <= max.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
    }
    prev2 = prev;
    prev = cur;
  }
  return Math.min(prev[b.length], max + 1);
}

/**
 * True if two different birthdates look like one is a typing slip of the
 * other: day/month swapped (03-12 vs 12-03), one digit wrong
 * (1990-05-10 vs 1990-05-11), or two adjacent digits swapped (1998 vs 1989).
 * Inputs are YYYY-MM-DD.
 */
export function isBirthdateTypo(a: string, b: string): boolean {
  if (a === b) return false;
  const [y, m, d] = a.split("-");
  if (m !== d && `${y}-${d}-${m}` === b) return true; // day/month swapped
  return editDistance(a.replace(/-/g, ""), b.replace(/-/g, ""), 1) <= 1;
}

// ─── pairwise comparison ───────────────────────────────────────────────────

/**
 * Compares a new/incoming person against ONE existing person.
 * Returns the reason they are (probably) the same, or null.
 */
export function compareIdentities(
  candidate: ResidentIdentity,
  existing: ResidentIdentity
): DuplicateReason | null {
  const cf = nameKey(candidate.fname);
  const cl = nameKey(candidate.lname);
  const ef = nameKey(existing.fname);
  const el = nameKey(existing.lname);
  const cb = birthdateISO(candidate.birthdate);
  const eb = birthdateISO(existing.birthdate);
  const sameBirthdate = cb === eb;

  if (cf === ef && cl === el && sameBirthdate) return "EXACT";

  // "Juan Cruz Jr." and "Juan Cruz Sr." are different people (father/son):
  // a differing suffix rules out every *fuzzy* match.
  const cs = nameKey(candidate.name_extension);
  const es = nameKey(existing.name_extension);
  if (cs && es && cs !== es) return null;

  if (sameBirthdate) {
    if (cf === el && cl === ef && cf !== cl) return "SWAPPED_NAMES";

    const distance =
      editDistance(cf, ef, 1) + editDistance(cl, el, 1);
    if (distance === 1) return "NAME_TYPO";
  } else if (cf === ef && cl === el && isBirthdateTypo(cb, eb)) {
    return "BIRTHDATE_TYPO";
  }

  return null;
}

// ─── indexed search ────────────────────────────────────────────────────────

/**
 * Index over a set of existing people so each lookup only touches the few
 * records that could possibly match, instead of every resident.
 *   - EXACT / SWAPPED / NAME_TYPO all require the SAME birthdate -> bucket by date
 *   - BIRTHDATE_TYPO requires the SAME normalized name       -> bucket by name
 * A 500-row import against 20,000 residents is therefore ~1,000 cheap lookups,
 * not 10,000,000 comparisons.
 *
 * `add()` lets a caller grow the index as it goes — the import uses this so
 * a row is also checked against the rows above it in the same file.
 */
export class DuplicateIndex<T extends ResidentIdentity> {
  private byBirthdate = new Map<string, T[]>();
  private byName = new Map<string, T[]>();

  constructor(records: Iterable<T> = []) {
    for (const r of records) this.add(r);
  }

  add(record: T): void {
    const b = birthdateISO(record.birthdate);
    const n = `${nameKey(record.fname)}|${nameKey(record.lname)}`;
    (this.byBirthdate.get(b) ?? this.byBirthdate.set(b, []).get(b)!).push(record);
    (this.byName.get(n) ?? this.byName.set(n, []).get(n)!).push(record);
  }

  /** All matches for `candidate`, strongest first (EXACT before POSSIBLE). */
  find(candidate: ResidentIdentity): DuplicateHit<T>[] {
    const pool = new Set<T>([
      ...(this.byBirthdate.get(birthdateISO(candidate.birthdate)) ?? []),
      ...(this.byName.get(`${nameKey(candidate.fname)}|${nameKey(candidate.lname)}`) ?? []),
    ]);

    const hits: DuplicateHit<T>[] = [];
    for (const record of pool) {
      const reason = compareIdentities(candidate, record);
      if (!reason) continue;
      hits.push({
        record,
        reason,
        level: reason === "EXACT" ? "EXACT" : "POSSIBLE",
        label: DUPLICATE_REASON_LABELS[reason],
      });
    }
    return hits.sort((x, y) => REASON_PRIORITY.indexOf(x.reason) - REASON_PRIORITY.indexOf(y.reason));
  }
}

/** One-off convenience for a single candidate against a list. */
export function findDuplicates<T extends ResidentIdentity>(
  candidate: ResidentIdentity,
  existing: T[]
): DuplicateHit<T>[] {
  return new DuplicateIndex(existing).find(candidate);
}

// ─── API helpers ───────────────────────────────────────────────────────────

export function toMatchInfo<T extends ResidentIdentity & { id?: number; rowNumber?: number }>(
  hit: DuplicateHit<T>
): DuplicateMatchInfo {
  return {
    ...(hit.record.rowNumber != null ? { rowNumber: hit.record.rowNumber } : {}),
    id: hit.record.id ?? null,
    fname: hit.record.fname,
    lname: hit.record.lname,
    mname: hit.record.mname ?? null,
    birthdate: birthdateISO(hit.record.birthdate),
    level: hit.level,
    reason: hit.reason,
    label: hit.label,
  };
}

/** "Juan Dela Cruz (1990-05-05, #12)" for messages. */
export function describeMatch(m: DuplicateMatchInfo): string {
  const name = [m.fname, m.mname, m.lname].filter(Boolean).join(" ");
  const ref = m.rowNumber != null ? `, row ${m.rowNumber}` : m.id != null ? `, #${m.id}` : "";
  return `${name} (${m.birthdate}${ref})`;
}

/**
 * SQL pre-filter for the single-resident case: instead of loading every
 * resident, fetch only people who could match — same birthdate (exact,
 * swapped, name typo) or same first+last name (birthdate typo). The precise
 * decision is still made in memory by compareIdentities().
 * Known limit: the name half of the filter is case-insensitive but not
 * accent-insensitive, so a birthdate typo on a name that differs ONLY by
 * accents won't be found on this path (the import path loads everyone and
 * does catch it).
 */
export function candidateWhere(c: { fname: string; lname: string; birthdate: Date }): Prisma.ResidentWhereInput {
  const eq = (value: string) => ({ equals: value, mode: "insensitive" as const });
  return {
    OR: [{ birthdate: c.birthdate }, { fname: eq(c.fname), lname: eq(c.lname) }],
  };
}

/** Columns needed to run a duplicate comparison — keeps queries slim. */
export const DUPLICATE_SELECT = {
  id: true,
  fname: true,
  lname: true,
  mname: true,
  name_extension: true,
  birthdate: true,
} as const;