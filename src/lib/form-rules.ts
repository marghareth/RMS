// FILE: src/lib/form-rules.ts
//
// Checks that look at more than one field at a time, or at what a value
// means in real life. For example: someone born yesterday can't have lived
// in the barangay for 10 years, and a hearing can't be before the incident.
// Single-field format checks (names, mobile numbers, a plausible birthdate)
// stay in src/lib/field-rules.ts and validations.ts.
//
// One set of rules, used in two places:
//   - the forms, to show an error under the field as soon as it's wrong
//     and stop Save until it's fixed;
//   - the API routes, through throwIfProblems(), so a bad value can't get
//     in another way (an old browser tab, a direct request, an import).
//
// Every function takes plain values (strings from a form, or Dates and
// numbers from the database) and returns a list of { field, message }.
// An empty list means everything is fine. Blank values are skipped here:
// whether a field is required is the form's and the schema's job.
//
// Pure module: no Prisma, no Node APIs, safe in the browser.

import { manilaToday } from "./field-rules";

export interface FieldProblem {
  field: string;
  message: string;
}

type DateLike = string | Date | null | undefined;
type NumberLike = string | number | null | undefined;

// ─── helpers ──────────────────────────────────────────────────────────────

/** A date as YYYY-MM-DD, or null when blank or unreadable. */
export function day(value: DateLike): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function num(value: NumberLike): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Today in the Philippines, YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return manilaToday(now);
}

/** Whole years between two YYYY-MM-DD dates (an age). */
export function yearsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return ty - fy - (tm < fm || (tm === fm && td < fd) ? 1 : 0);
}

/** "less than a year old", "1 year old", "34 years old" */
function ageWords(age: number): string {
  return age < 1 ? "less than a year old" : `${age} year${age === 1 ? "" : "s"} old`;
}

/** Age on a given day (default today), or null when there's no birthdate. */
export function ageOn(birthdate: DateLike, on: DateLike = today()): number | null {
  const b = day(birthdate);
  const o = day(on);
  return b && o ? yearsBetween(b, o) : null;
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function notInFuture(field: string, value: DateLike, what: string, now?: Date): FieldProblem[] {
  const d = day(value);
  return d && d > today(now) ? [{ field, message: `${what} can't be in the future.` }] : [];
}

function notBefore(field: string, value: DateLike, other: DateLike, message: string): FieldProblem[] {
  const a = day(value);
  const b = day(other);
  return a && b && a < b ? [{ field, message }] : [];
}

// ─── residents ────────────────────────────────────────────────────────────

/** Civil statuses that only make sense for an adult (RA 11596 bans marriage under 18). */
const ADULT_CIVIL_STATUS = new Set(["MARRIED", "WIDOWED", "SEPARATED"]);
const CIVIL_STATUS_WORD: Record<string, string> = { MARRIED: "married", WIDOWED: "widowed", SEPARATED: "separated" };

/** Youngest age at which someone could have voted (SK elections start at 15). */
export const MIN_VOTING_AGE = 15;
export const SENIOR_AGE = 60;
export const YOUTH_MIN_AGE = 15;
export const YOUTH_MAX_AGE = 30;

export interface ResidentValues {
  birthdate?: DateLike;
  residency_start_date?: DateLike;
  civil_status?: string | null;
  sector?: string | null;
  last_voted_year?: NumberLike;
  is_registered_voter?: boolean | null;
  is_resident_voter?: boolean | null;
  height_m?: NumberLike;
  weight_kg?: NumberLike;
}

export function residentProblems(v: ResidentValues, now?: Date): FieldProblem[] {
  const problems: FieldProblem[] = [];
  let birth = day(v.birthdate);

  // Birthdate itself (the schema checks this too; here it's for the form)
  if (birth && birth > today(now)) {
    problems.push({ field: "birthdate", message: "Date of birth can't be in the future." });
    birth = null;
  } else if (birth && yearsBetween(birth, today(now)) > 120) {
    problems.push({ field: "birthdate", message: "That would make this person over 120. Check the year." });
    birth = null;
  }
  const age = birth ? yearsBetween(birth, today(now)) : null;

  // Residency
  problems.push(...notInFuture("residency_start_date", v.residency_start_date, "Resident since", now));
  if (birth) {
    problems.push(
      ...notBefore(
        "residency_start_date",
        v.residency_start_date,
        birth,
        `Resident since can't be before the birthdate (${formatDay(birth)}).`
      )
    );
  }

  // Civil status vs age
  if (age !== null && age < 18 && v.civil_status && ADULT_CIVIL_STATUS.has(v.civil_status)) {
    problems.push({
      field: "civil_status",
      message: `This person is ${ageWords(age)}, too young to be ${CIVIL_STATUS_WORD[v.civil_status]}. Check the birthdate or the civil status.`,
    });
  }

  // Sector vs age
  if (age !== null && v.sector === "SENIOR" && age < SENIOR_AGE) {
    problems.push({ field: "sector", message: `Senior citizens are ${SENIOR_AGE} or older. This person is ${ageWords(age)}.` });
  }
  if (age !== null && v.sector === "YOUTH" && (age < YOUTH_MIN_AGE || age > YOUTH_MAX_AGE)) {
    problems.push({ field: "sector", message: `Youth is ages ${YOUTH_MIN_AGE} to ${YOUTH_MAX_AGE}. This person is ${ageWords(age)}.` });
  }

  // Voting
  const voted = num(v.last_voted_year);
  if (voted !== null) {
    const thisYear = Number(today(now).slice(0, 4));
    if (!Number.isInteger(voted) || voted < 1900) {
      problems.push({ field: "last_voted_year", message: "Enter a 4-digit year, like 2022." });
    } else if (voted > thisYear) {
      problems.push({ field: "last_voted_year", message: "Last voted can't be a future year." });
    } else if (birth && voted < Number(birth.slice(0, 4)) + MIN_VOTING_AGE) {
      problems.push({
        field: "last_voted_year",
        message: `They would have been under ${MIN_VOTING_AGE} in ${voted}, too young to vote.`,
      });
    }
  }
  if (v.is_resident_voter && v.is_registered_voter === false) {
    problems.push({ field: "is_resident_voter", message: "A resident voter has to be a registered voter too." });
  }
  if (age !== null && age < MIN_VOTING_AGE && v.is_registered_voter) {
    problems.push({ field: "is_registered_voter", message: `Voters are at least ${MIN_VOTING_AGE}. This person is ${ageWords(age)}.` });
  }

  // Body measurements
  const h = num(v.height_m);
  if (h !== null) {
    if (h > 3 && h <= 300) {
      problems.push({ field: "height_m", message: `That looks like centimetres. Enter metres, e.g. ${(h / 100).toFixed(2)}.` });
    } else if (h < 0.3 || h > 2.5) {
      problems.push({ field: "height_m", message: "Height should be between 0.30 and 2.50 metres." });
    }
  }
  const w = num(v.weight_kg);
  if (w !== null && (w < 0.5 || w > 350)) {
    problems.push({ field: "weight_kg", message: "Weight should be between 0.5 and 350 kg." });
  }

  return problems;
}

/** A sector or registry that depends on age (Senior 60+, Youth 15–30). */
export function sectorAgeProblem(sector: string, birthdate: DateLike, now?: Date): string | null {
  const age = ageOn(birthdate, today(now));
  if (age === null) return null;
  if ((sector === "SENIOR" || sector === "SENIOR_CITIZEN") && age < SENIOR_AGE) {
    return `Senior citizens are ${SENIOR_AGE} or older. This person is ${ageWords(age)}.`;
  }
  if (sector === "YOUTH" && (age < YOUTH_MIN_AGE || age > YOUTH_MAX_AGE)) {
    return `Youth is ages ${YOUTH_MIN_AGE} to ${YOUTH_MAX_AGE}. This person is ${ageWords(age)}.`;
  }
  return null;
}

/** A date about a resident that can't be before they were born, or in the future. */
export function lifeEventProblems(
  field: string,
  value: DateLike,
  what: string,
  birthdate: DateLike,
  now?: Date
): FieldProblem[] {
  const b = day(birthdate);
  return [
    ...notInFuture(field, value, what, now),
    ...(b ? notBefore(field, value, b, `${what} can't be before the person's birthdate (${formatDay(b)}).`) : []),
  ];
}

// ─── households ───────────────────────────────────────────────────────────

export function householdProblems(v: {
  no_of_families?: NumberLike;
  monthly_income?: NumberLike;
  housing_type?: string | null;
  housing_type_other?: string | null;
  tenure_status?: string | null;
  tenure_other?: string | null;
  household_unit?: string | null;
  household_unit_other?: string | null;
}): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const families = num(v.no_of_families);
  if (families !== null && (!Number.isInteger(families) || families < 1)) {
    problems.push({ field: "no_of_families", message: "Number of families has to be a whole number, 1 or more." });
  } else if (families !== null && families > 50) {
    problems.push({ field: "no_of_families", message: "That's a lot of families for one household. Check the number." });
  }
  const income = num(v.monthly_income);
  if (income !== null && income < 0) problems.push({ field: "monthly_income", message: "Monthly income can't be negative." });
  // "Other" needs to say what it is.
  const other: [string | null | undefined, string | null | undefined, string, string][] = [
    [v.housing_type, v.housing_type_other, "housing_type_other", "housing type"],
    [v.tenure_status, v.tenure_other, "tenure_other", "tenure status"],
    [v.household_unit, v.household_unit_other, "household_unit_other", "household unit"],
  ];
  for (const [choice, text, field, what] of other) {
    if (choice === "OTHER" && !text?.trim()) problems.push({ field, message: `Say what the other ${what} is.` });
  }
  return problems;
}

// ─── blotter ──────────────────────────────────────────────────────────────

export interface BlotterValues {
  incident_date?: DateLike;
  hearing_date?: DateLike;
  complainant_id?: NumberLike;
  respondent_id?: NumberLike;
}

export function blotterProblems(v: BlotterValues, now?: Date): FieldProblem[] {
  const problems = [
    ...notInFuture("incident_date", v.incident_date, "Incident date", now),
    ...notBefore("hearing_date", v.hearing_date, v.incident_date, "The hearing can't be before the incident."),
  ];
  const c = num(v.complainant_id);
  if (c !== null && c === num(v.respondent_id)) {
    problems.push({ field: "respondent_id", message: "The complainant and respondent can't be the same person." });
  }
  return problems;
}

// ─── officials ────────────────────────────────────────────────────────────

export const MIN_OFFICIAL_AGE = 18;

export function officialProblems(
  v: { term_start?: DateLike; term_end?: DateLike },
  residentBirthdate?: DateLike
): FieldProblem[] {
  const problems = notBefore("term_end", v.term_end, v.term_start, "Term end can't be before term start.");
  const start = day(v.term_start);
  if (start && day(v.term_end) === start) {
    problems.push({ field: "term_end", message: "Term end has to be after term start." });
  }
  const age = start ? ageOn(residentBirthdate, start) : null;
  if (age !== null && age < MIN_OFFICIAL_AGE) {
    problems.push({
      field: "term_start",
      message: `This resident would be ${ageWords(age)} at the start of the term. Officials must be at least ${MIN_OFFICIAL_AGE}.`,
    });
  }
  return problems;
}

// ─── equipment ────────────────────────────────────────────────────────────

export function equipmentProblems(
  v: { purchase_date?: DateLike; date_acquired?: DateLike },
  now?: Date
): FieldProblem[] {
  return [
    ...notInFuture("purchase_date", v.purchase_date, "Purchase date", now),
    ...notInFuture("date_acquired", v.date_acquired, "Date acquired", now),
    ...notBefore("date_acquired", v.date_acquired, v.purchase_date, "Date acquired can't be before the purchase date."),
  ];
}

/** Borrowing can be booked ahead, so only the order of the two dates matters. */
export function borrowProblems(v: { date_borrowed?: DateLike; expected_return?: DateLike }): FieldProblem[] {
  return notBefore("expected_return", v.expected_return, v.date_borrowed, "Expected return can't be before the date borrowed.");
}

// ─── finance ──────────────────────────────────────────────────────────────

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function appropriationProblems(v: {
  appropriated_amount?: NumberLike;
  obligated_amount?: NumberLike;
  disbursed_amount?: NumberLike;
}): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const appropriated = num(v.appropriated_amount);
  const obligated = num(v.obligated_amount);
  const disbursed = num(v.disbursed_amount);
  if (appropriated !== null && obligated !== null && obligated > appropriated) {
    problems.push({
      field: "obligated_amount",
      message: `Obligated (${peso(obligated)}) can't be more than the appropriated amount (${peso(appropriated)}).`,
    });
  }
  if (obligated !== null && disbursed !== null && disbursed > obligated) {
    problems.push({
      field: "disbursed_amount",
      message: `Disbursed (${peso(disbursed)}) can't be more than the obligated amount (${peso(obligated)}).`,
    });
  }
  return problems;
}

/** Revenues, disbursements and transactions: a real amount, on a day that has happened. */
export function moneyEntryProblems(
  v: { amount?: NumberLike; date?: DateLike },
  opts: { dateField?: string; what?: string } = {},
  now?: Date
): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const amount = num(v.amount);
  if (amount !== null && amount <= 0) problems.push({ field: "amount", message: "Amount has to be more than ₱0." });
  if (amount !== null && amount > 1_000_000_000) {
    problems.push({ field: "amount", message: "That amount looks too large. Check for extra zeros." });
  }
  problems.push(...notInFuture(opts.dateField ?? "date", v.date, opts.what ?? "Date", now));
  return problems;
}

// ─── meetings ─────────────────────────────────────────────────────────────

export function meetingProblems(
  v: { meeting_date?: DateLike; status?: string | null; minutes?: string | null },
  now?: Date
): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const d = day(v.meeting_date);
  const future = !!d && d > today(now);
  if (future && v.status === "COMPLETED") {
    problems.push({ field: "status", message: "A meeting can't be marked completed before its date." });
  }
  if (future && v.minutes?.trim()) {
    problems.push({ field: "minutes", message: "Minutes can only be recorded once the meeting has happened." });
  }
  return problems;
}

// ─── form helpers ─────────────────────────────────────────────────────────

/** The first message for a field, for showing under that field. */
export function problemFor(problems: FieldProblem[], field: string): string | undefined {
  return problems.find((p) => p.field === field)?.message;
}

/** For From/To date filters: a message when To is before From. */
export function rangeError(from: DateLike, to: DateLike): string | undefined {
  const a = day(from);
  const b = day(to);
  return a && b && b < a ? "“To” can't be before “From”." : undefined;
}

// ─── single fields: required, names, numbers, contacts ─────────────────────

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldKind = "text" | "name" | "mobile" | "phone" | "contact" | "email" | "money" | "count";

export interface FieldSpec {
  field: string;
  label: string;
  value: string | number | null | undefined;
  required?: boolean;
  kind?: FieldKind;
  /** Longest allowed text. Defaults to 200. */
  max?: number;
}

/**
 * Checks each field on its own: filled in when required, not too long, and
 * the right shape for its kind:
 *   name     letters, spaces, . ' - only (like the resident name fields)
 *   mobile   PH mobile, 09XXXXXXXXX or +639XXXXXXXXX
 *   phone    7–12 digits
 *   contact  a PH mobile or a 7–12 digit phone
 *   email    something@domain.tld
 *   money    a number, 0 or more
 *   count    a whole number, 0 or more
 */
export function fieldProblems(specs: FieldSpec[]): FieldProblem[] {
  const problems: FieldProblem[] = [];
  for (const s of specs) {
    const raw = s.value == null ? "" : String(s.value).trim();
    if (raw === "") {
      if (s.required) problems.push({ field: s.field, message: `${s.label} is required.` });
      continue;
    }
    const max = s.max ?? 200;
    if (raw.length > max) {
      problems.push({ field: s.field, message: `${s.label} is too long (${max} characters at most).` });
      continue;
    }
    const digits = raw.replace(/\D/g, "");
    const isMobile = /^(?:\+?63|0)9\d{9}$/.test(raw.replace(/[\s\-().]/g, ""));
    const isPhone = /^\+?[\d\s\-().]+$/.test(raw) && digits.length >= 7 && digits.length <= 12;
    switch (s.kind) {
      case "name":
        if (!NAME_RE.test(raw)) {
          problems.push({ field: s.field, message: `${s.label} can only have letters, spaces, periods, hyphens and apostrophes.` });
        }
        break;
      case "mobile":
        if (!isMobile) problems.push({ field: s.field, message: `${s.label} should be a PH mobile number, like 09171234567.` });
        break;
      case "phone":
        if (!isPhone) problems.push({ field: s.field, message: `${s.label} should have 7 to 12 digits.` });
        break;
      case "contact":
        if (!isMobile && !isPhone) {
          problems.push({ field: s.field, message: `${s.label} should be a mobile number like 09171234567, or a landline.` });
        }
        break;
      case "email":
        if (!EMAIL_RE.test(raw)) problems.push({ field: s.field, message: `${s.label} doesn't look like an email address.` });
        break;
      case "money": {
        const n = num(raw);
        if (n === null) problems.push({ field: s.field, message: `${s.label} has to be a number.` });
        else if (n < 0) problems.push({ field: s.field, message: `${s.label} can't be negative.` });
        else if (n > 1_000_000_000) problems.push({ field: s.field, message: `${s.label} looks too large. Check for extra zeros.` });
        break;
      }
      case "count": {
        const n = num(raw);
        if (n === null || !Number.isInteger(n) || n < 0) {
          problems.push({ field: s.field, message: `${s.label} has to be a whole number.` });
        }
        break;
      }
    }
  }
  return problems;
}

/** For lists of names (puroks, incident types): "already exists", ignoring capitals and spaces. */
export function duplicateNameProblem(
  name: string,
  existing: { id: number; name: string }[],
  what: string,
  exceptId?: number | null
): string | undefined {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return undefined;
  if (key.length > 100) return `${what} name is too long (100 characters at most).`;
  const clash = existing.find((e) => e.id !== exceptId && e.name.trim().toLowerCase().replace(/\s+/g, " ") === key);
  return clash ? `There's already a ${what.toLowerCase()} called "${clash.name}".` : undefined;
}