// FILE: src/lib/residentImport.ts
//
// Shared between POST /api/residents/import/preview and
// POST /api/residents/import/commit so both routes validate rows
// identically — the commit route re-validates from scratch rather than
// trusting whatever the client sends back from the preview step, since a
// preview response is just JSON a browser could tamper with before
// re-submitting it.

import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { civilStatusEnum, sexEnum } from "@/lib/validations";

// The columns a barangay's field census spreadsheet is expected to have.
// Kept intentionally smaller than the full Resident model (which has 40+
// fields) — this covers what's actually collected on a typical door-to-door
// RBI form. Anything not listed here can still be filled in later through
// the normal Edit Resident form.
export const RESIDENT_IMPORT_COLUMNS = [
  { key: "fname", label: "First Name", required: true },
  { key: "lname", label: "Last Name", required: true },
  { key: "mname", label: "Middle Name", required: false },
  { key: "name_extension", label: "Suffix (Jr., Sr., III)", required: false },
  { key: "birthdate", label: "Birthdate (YYYY-MM-DD)", required: true },
  { key: "sex", label: "Sex (MALE/FEMALE)", required: true },
  { key: "civil_status", label: "Civil Status (SINGLE/MARRIED/WIDOWED/SEPARATED/LIVE_IN)", required: true },
  { key: "purok_name", label: "Purok", required: false },
  { key: "household_no", label: "Household No.", required: false },
  { key: "place_of_birth", label: "Place of Birth", required: false },
  { key: "religion", label: "Religion", required: false },
  { key: "employment_status", label: "Employment Status", required: false },
  { key: "educational_attainment", label: "Educational Attainment", required: false },
  { key: "occupation", label: "Occupation", required: false },
  { key: "income_bracket", label: "Income Bracket", required: false },
  { key: "mobile", label: "Mobile No.", required: false },
  { key: "email", label: "Email", required: false },
] as const;

export type ResidentImportRow = Record<(typeof RESIDENT_IMPORT_COLUMNS)[number]["key"], string>;

/** Generates the downloadable CSV template with just a header row. */
export function buildImportTemplateCsv(): string {
  return RESIDENT_IMPORT_COLUMNS.map((c) => c.key).join(",") + "\n";
}

export class ImportParseError extends Error {}

/**
 * Parses an uploaded .csv or .xlsx file into an array of row objects keyed
 * by column header. Header matching is case/whitespace-tolerant against
 * RESIDENT_IMPORT_COLUMNS' keys and labels, so a spreadsheet with
 * "First Name" or "fname" or " FNAME " as its header all resolve the same.
 */
export function parseImportFile(buffer: Buffer, filename: string): Record<string, string>[] {
  const isExcel = /\.xlsx?$/i.test(filename);

  let rawRows: Record<string, unknown>[];
  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new ImportParseError("The uploaded file has no sheets.");
    const sheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } else {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      throw new ImportParseError(`CSV parse error: ${result.errors[0].message} (row ${result.errors[0].row ?? "?"})`);
    }
    rawRows = result.data;
  }

  const keyByHeader = new Map<string, string>();
  for (const col of RESIDENT_IMPORT_COLUMNS) {
    keyByHeader.set(col.key.toLowerCase(), col.key);
    keyByHeader.set(col.label.toLowerCase(), col.key);
  }

  return rawRows.map((rawRow) => {
    const normalized: Record<string, string> = {};
    for (const [header, value] of Object.entries(rawRow)) {
      const normalizedHeader = header.trim().toLowerCase();
      const key = keyByHeader.get(normalizedHeader);
      if (!key) continue; // unrecognized column — ignored rather than erroring the whole file
      if (value instanceof Date) {
        normalized[key] = value.toISOString().slice(0, 10);
      } else {
        normalized[key] = String(value ?? "").trim();
      }
    }
    return normalized;
  });
}

// Per-row schema. Distinct from residentCreateSchema (validations.ts):
// purok_name/household_no are human-readable strings here, resolved to
// purok_id/household_id by the caller via the lookup maps below — a CSV
// author writing "Purok II" shouldn't need to know the internal id.
const importRowSchema = z.object({
  fname: z.string().trim().min(1, "First name is required").max(100),
  lname: z.string().trim().min(1, "Last name is required").max(100),
  mname: z.string().trim().max(100).optional(),
  name_extension: z.string().trim().max(20).optional(),
  birthdate: z.coerce.date({ error: "Invalid date — use YYYY-MM-DD" }),
  sex: sexEnum,
  civil_status: civilStatusEnum,
  purok_name: z.string().trim().optional(),
  household_no: z.string().trim().optional(),
  place_of_birth: z.string().trim().optional(),
  religion: z.string().trim().optional(),
  employment_status: z.string().trim().optional(),
  educational_attainment: z.string().trim().optional(),
  occupation: z.string().trim().optional(),
  income_bracket: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export interface ImportLookups {
  /** Purok name (lowercased) -> id */
  puroksByName: Map<string, number>;
  /** Household no. (lowercased) -> { id, purok_id } */
  householdsByNo: Map<string, { id: number; purok_id: number }>;
}

export interface ValidatedImportRow {
  rowNumber: number; // 1-based, matches spreadsheet row (header excluded)
  raw: Record<string, string>;
  data?: {
    fname: string;
    lname: string;
    mname: string | null;
    name_extension: string | null;
    birthdate: Date;
    sex: "MALE" | "FEMALE";
    civil_status: "SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED" | "LIVE_IN";
    purok_id: number | null;
    household_id: number | null;
    place_of_birth: string | null;
    religion: string | null;
    employment_status: string | null;
    educational_attainment: string | null;
    occupation: string | null;
    income_bracket: string | null;
    mobile: string | null;
    email: string | null;
  };
  errors: string[];
  /** true if this row's fname+lname+birthdate matches an existing resident OR an earlier row in the same file. */
  isDuplicate: boolean;
}

/**
 * Validates and normalizes one CSV row. Doesn't touch the database itself
 * (duplicate-checking against existing residents is the caller's job,
 * since that needs a DB query this function deliberately stays sync/pure
 * for) — see checkDuplicateAgainstDb in the preview route.
 */
export function validateImportRow(
  rowNumber: number,
  raw: Record<string, string>,
  lookups: ImportLookups
): ValidatedImportRow {
  const errors: string[] = [];

  const parsed = importRowSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { rowNumber, raw, errors, isDuplicate: false };
  }

  const row = parsed.data;

  let purok_id: number | null = null;
  if (row.purok_name) {
    const found = lookups.puroksByName.get(row.purok_name.toLowerCase());
    if (!found) errors.push(`purok_name: "${row.purok_name}" doesn't match any existing purok`);
    else purok_id = found;
  }

  let household_id: number | null = null;
  if (row.household_no) {
    const found = lookups.householdsByNo.get(row.household_no.toLowerCase());
    if (!found) {
      errors.push(`household_no: "${row.household_no}" doesn't match any existing household`);
    } else {
      household_id = found.id;
      // If both were given and disagree, the household's purok wins —
      // it's the more specific/reliable of the two.
      if (purok_id && purok_id !== found.purok_id) {
        purok_id = found.purok_id;
      } else if (!purok_id) {
        purok_id = found.purok_id;
      }
    }
  }

  if (errors.length > 0) {
    return { rowNumber, raw, errors, isDuplicate: false };
  }

  return {
    rowNumber,
    raw,
    errors: [],
    isDuplicate: false, // set by the caller after checking against the DB + sibling rows
    data: {
      fname: row.fname,
      lname: row.lname,
      mname: row.mname || null,
      name_extension: row.name_extension || null,
      birthdate: row.birthdate,
      sex: row.sex,
      civil_status: row.civil_status,
      purok_id,
      household_id,
      place_of_birth: row.place_of_birth || null,
      religion: row.religion || null,
      employment_status: row.employment_status || null,
      educational_attainment: row.educational_attainment || null,
      occupation: row.occupation || null,
      income_bracket: row.income_bracket || null,
      mobile: row.mobile || null,
      email: row.email || null,
    },
  };
}