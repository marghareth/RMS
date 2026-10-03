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
import type { DuplicateMatchInfo } from "@/lib/duplicate-detection";
import type { ImportIssue, ImportErrorType } from "@/lib/importMetrics";
import { personName, optionalPersonName, nameSuffix, birthdate, phMobile } from "@/lib/field-rules";

import { RESIDENT_IMPORT_COLUMNS } from "@/lib/residentImportColumns";

// Re-exported so existing imports from "@/lib/residentImport" keep working.
export { RESIDENT_IMPORT_COLUMNS };

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
  // Same rules as the manual form (src/lib/field-rules.ts), so a row that
  // would be rejected by "Add Resident" is rejected here too.
  fname: personName({ requiredMessage: "First name is required" }),
  lname: personName({ requiredMessage: "Last name is required" }),
  mname: optionalPersonName().optional(),
  name_extension: nameSuffix.optional(),
  birthdate: birthdate,
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
  mobile: phMobile.optional(), // normalized to 09XXXXXXXXX (null when blank)
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
  /**
   * The same problems as `errors`, structured (field + error type) so the
   * preview can count them by type/field. `errors` stays the human-readable
   * form shown in the UI; see src/lib/importMetrics.ts for the definitions.
   */
  issues: ImportIssue[];
  /**
   * true if this row is the SAME person (after name normalization) as an
   * existing resident OR an earlier row in the file. Hard block: such a row
   * can never be imported.
   */
  isDuplicate: boolean;
  /**
   * Existing residents / earlier rows this one merely RESEMBLES (swapped
   * names, one-letter typo, likely birthdate typo). A warning, not a block:
   * the row is importable once the user explicitly confirms it. Filled in by
   * the caller (needs the DB), like isDuplicate. See src/lib/duplicate-detection.ts.
   */
  possibleDuplicates: DuplicateMatchInfo[];
}

const REQUIRED_FIELDS = new Set<string>(RESIDENT_IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key));

/**
 * Decides which ImportErrorType a schema failure is. Looks at what was
 * actually in the cell rather than parsing message text, so rewording a
 * validation message can never change the metrics.
 */
export function classifyFieldIssue(field: string, zodCode: string, rawValue: string | undefined): ImportErrorType {
  const blank = rawValue == null || rawValue.trim() === "";
  if (blank && REQUIRED_FIELDS.has(field)) return "MISSING_REQUIRED";
  if (field === "birthdate") return "INVALID_DATE";
  if (zodCode === "invalid_value") return "INVALID_OPTION"; // not one of the enum values
  return "INVALID_FORMAT";
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
  const issues: ImportIssue[] = [];

  const parsed = importRowSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".");
      errors.push(`${field}: ${issue.message}`);
      issues.push({ field, type: classifyFieldIssue(field, issue.code, raw[field]), message: issue.message });
    }
    return { rowNumber, raw, errors, issues, isDuplicate: false, possibleDuplicates: [] };
  }

  const row = parsed.data;

  let purok_id: number | null = null;
  if (row.purok_name) {
    const found = lookups.puroksByName.get(row.purok_name.toLowerCase());
    if (!found) {
      const message = `"${row.purok_name}" doesn't match any existing purok`;
      errors.push(`purok_name: ${message}`);
      issues.push({ field: "purok_name", type: "UNKNOWN_REFERENCE", message });
    } else purok_id = found;
  }

  let household_id: number | null = null;
  if (row.household_no) {
    const found = lookups.householdsByNo.get(row.household_no.toLowerCase());
    if (!found) {
      const message = `"${row.household_no}" doesn't match any existing household`;
      errors.push(`household_no: ${message}`);
      issues.push({ field: "household_no", type: "UNKNOWN_REFERENCE", message });
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
    return { rowNumber, raw, errors, issues, isDuplicate: false, possibleDuplicates: [] };
  }

  return {
    rowNumber,
    raw,
    errors: [],
    issues: [],
    isDuplicate: false, // set by the caller after checking against the DB + sibling rows
    possibleDuplicates: [], // likewise
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