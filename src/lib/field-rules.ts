// FILE: src/lib/field-rules.ts
//
// Field-level validation + normalization rules for resident data, shared by
// residentCreateSchema (validations.ts) and the CSV/Excel import row schema
// (residentImport.ts) so the manual form and the bulk import accept and
// reject exactly the same values.
//
// Why this exists: the schemas used to check little more than "is it a
// non-empty string / a parseable date", so values like a birthdate in the
// year 2087, a mobile number of "n/a", or a name of "  Juan   123 " were all
// stored as-is. Each rule below does two jobs:
//   1. REJECT values that are structurally impossible, with a message a
//      barangay encoder can act on, and
//   2. NORMALIZE accepted values to one canonical form (single-spaced
//      names, mobile as 09XXXXXXXXX, digits-only PhilSys number) so that
//      searching, de-duplication and reports compare like with like.
//
// Pure module: depends only on zod, no Prisma/Node APIs.

import { z } from "zod";

// ─── helpers ───────────────────────────────────────────────────────────────

/** Trims and collapses any run of whitespace (incl. tabs/newlines/NBSP) to one space. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Today's calendar date in the Philippines (UTC+8) as YYYY-MM-DD. */
export function manilaToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ─── names ─────────────────────────────────────────────────────────────────

// Letters (any script/accents, so ñ, é, etc. are fine), combining marks,
// spaces, periods ("Ma."), hyphens ("Dela Cruz-Santos") and apostrophes
// ("D'Souza"). Must start with a letter. Digits and other symbols are out.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const NAME_MESSAGE =
  "may only contain letters, spaces, periods, hyphens and apostrophes";

/** Required person name (first/last). Output: trimmed, single-spaced. */
export function personName(opts: { requiredMessage?: string; max?: number } = {}) {
  const { requiredMessage = "Required", max = 100 } = opts;
  return z
    .string()
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .min(1, requiredMessage)
        .max(max, `must be ${max} characters or fewer`)
        .regex(NAME_PATTERN, NAME_MESSAGE)
    );
}

/** Optional person name (middle name, mother's maiden name). "" is allowed. */
export function optionalPersonName(max = 100) {
  return z
    .string()
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .max(max, `must be ${max} characters or fewer`)
        .refine((v) => v === "" || NAME_PATTERN.test(v), NAME_MESSAGE)
    );
}

const SUFFIX_PATTERN = /^[\p{L}\p{N}. ]+$/u; // "Jr.", "Sr.", "III", "2nd"

/** Name suffix: Jr., Sr., III … Optional, "" allowed. */
export const nameSuffix = z
  .string()
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .max(20, "must be 20 characters or fewer")
      .refine((v) => v === "" || SUFFIX_PATTERN.test(v), "may only contain letters, numbers and periods")
  );

// ─── birthdate ─────────────────────────────────────────────────────────────

export const MAX_AGE_YEARS = 120;

/**
 * Returns an error message if `date` is not a plausible birthdate, else null.
 * Compared as calendar dates in Philippine time so that a baby born "today"
 * is accepted even when the server clock (UTC) is still on the previous day.
 */
export function birthdateProblem(date: Date, now: Date = new Date()): string | null {
  if (Number.isNaN(date.getTime())) return "Invalid date — use YYYY-MM-DD";

  const iso = date.toISOString().slice(0, 10);
  const today = manilaToday(now);
  if (iso > today) return "cannot be in the future";

  const [y, m, d] = today.split("-");
  const earliest = `${Number(y) - MAX_AGE_YEARS}-${m}-${d}`;
  if (iso < earliest) {
    return `would make this person over ${MAX_AGE_YEARS} years old — please check the year`;
  }
  return null;
}

/** Required birthdate. Output: a Date (as before), now range-checked. */
export const birthdate = z.coerce
  .date({ error: "Invalid date — use YYYY-MM-DD" })
  .superRefine((value, ctx) => {
    const problem = birthdateProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

// ─── phone numbers, PhilSys, ZIP ───────────────────────────────────────────

const stripSeparators = (v: string) => v.replace(/[\s\-().]/g, "");

/**
 * Normalizes a Philippine mobile number to 09XXXXXXXXX.
 * Accepts 09XXXXXXXXX, +639XXXXXXXXX and 639XXXXXXXXX (spaces/hyphens ok).
 * Returns null if it isn't one of those.
 */
export function normalizePhMobile(input: string): string | null {
  const m = stripSeparators(input).match(/^(?:\+?63|0)(9\d{9})$/);
  return m ? `0${m[1]}` : null;
}

/** Optional PH mobile. "" → null. Output is always 09XXXXXXXXX or null. */
export const phMobile = z.string().transform((raw, ctx) => {
  const value = raw.trim();
  if (value === "") return null;

  const normalized = normalizePhMobile(value);
  if (normalized) return normalized;

  // Excel drops the leading 0 of 09171234567 when a column is numeric — name
  // that case specifically since it's by far the most common import mistake.
  const digits = stripSeparators(value);
  const message = /^9\d{9}$/.test(digits)
    ? "is missing its leading 0 (Excel often removes it) — use 09XXXXXXXXX"
    : "must be a Philippine mobile number like 09171234567 or +639171234567";
  ctx.addIssue({ code: "custom", message });
  return z.NEVER;
});

/** Optional landline/other phone: 7–12 digits, only digits and + ( ) - . space. */
export const phoneNumber = z.string().transform((raw, ctx) => {
  const value = collapseSpaces(raw);
  if (value === "") return null;

  const digitCount = value.replace(/\D/g, "").length;
  if (!/^\+?[\d\s\-().]+$/.test(value) || digitCount < 7 || digitCount > 12) {
    ctx.addIssue({ code: "custom", message: "must have 7–12 digits (numbers, spaces, + ( ) - only)" });
    return z.NEVER;
  }
  return value;
});

/**
 * Optional PhilSys number. Accepts the 12-digit PSN or the 16-digit card
 * number, with or without spaces/hyphens. Stored as digits only. "" → null.
 */
export const philsysNumber = z.string().transform((raw, ctx) => {
  const value = raw.trim();
  if (value === "") return null;

  const digits = value.replace(/[\s-]/g, "");
  if (!/^(\d{12}|\d{16})$/.test(digits)) {
    ctx.addIssue({ code: "custom", message: "must be 12 digits (PSN) or 16 digits (card number)" });
    return z.NEVER;
  }
  return digits;
});

/** Optional Philippine ZIP code: exactly 4 digits. "" → null. */
export const zipCode = z.string().transform((raw, ctx) => {
  const value = raw.trim();
  if (value === "") return null;
  if (!/^\d{4}$/.test(value)) {
    ctx.addIssue({ code: "custom", message: "must be a 4-digit Philippine ZIP code" });
    return z.NEVER;
  }
  return value;
});