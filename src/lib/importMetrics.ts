// FILE: src/lib/importMetrics.ts
//
// Data-quality metrics for a resident import, plus the CSV reports built
// from them. This is where the study's "error rate in automated data entry"
// comes from, so every number has an exact definition (below) and the
// categories are guaranteed to add up (see the invariant test).
//
// Dependency-free on purpose (no Prisma, no xlsx, no Node APIs): the import
// page runs this in the BROWSER to build the downloads, and the preview route
// runs it on the server for the summary it returns.
//
// ── Definitions ────────────────────────────────────────────────────────────
// N = rows read from the file (header excluded).
// Every row ends up in exactly ONE of four buckets:
//   invalid      failed field validation (missing/invalid values, unknown purok…)
//   duplicate    passed validation but is the SAME person as an existing
//                resident or an earlier row  (blocked)
//   possible     passed validation, not a duplicate, but resembles someone
//                already on file (warning; importable after confirmation)
//   ready        none of the above
//   =>  invalid + duplicate + possible + ready = N
//
// errorRate              = (invalid + duplicate) / N × 100
//                          "share of rows the system could NOT enter
//                           automatically"  ← the headline number
// validationErrorRate    = invalid / N × 100
// duplicateRate          = duplicate / N × 100
// possibleDuplicateRate  = possible / N × 100  (a warning, NOT an error)
//
// A row can have several problems; per-type and per-field counts are "rows
// affected", so a row with two bad-format fields adds 1 to INVALID_FORMAT.
// Duplicates are only evaluated for rows that already passed validation, so
// a row is never counted as both invalid and duplicate.

import { describeMatch, type DuplicateMatchInfo } from "@/lib/duplicate-detection";

// ─── error types ───────────────────────────────────────────────────────────

export type ImportErrorType =
  | "MISSING_REQUIRED"   // a required column is blank (name, birthdate, sex, civil status)
  | "INVALID_DATE"       // birthdate not a real/plausible date
  | "INVALID_OPTION"     // sex / civil status not one of the allowed values
  | "INVALID_FORMAT"     // wrong shape: name characters, mobile, email, length…
  | "UNKNOWN_REFERENCE"  // purok / household number that doesn't exist
  | "DUPLICATE_EXISTING" // same person already registered
  | "DUPLICATE_IN_FILE"; // same person appears earlier in this file

export const IMPORT_ERROR_TYPES: readonly ImportErrorType[] = [
  "MISSING_REQUIRED",
  "INVALID_DATE",
  "INVALID_OPTION",
  "INVALID_FORMAT",
  "UNKNOWN_REFERENCE",
  "DUPLICATE_EXISTING",
  "DUPLICATE_IN_FILE",
];

export const IMPORT_ERROR_TYPE_LABELS: Record<ImportErrorType, string> = {
  MISSING_REQUIRED: "Missing required value",
  INVALID_DATE: "Invalid birthdate",
  INVALID_OPTION: "Invalid option (sex / civil status)",
  INVALID_FORMAT: "Invalid format",
  UNKNOWN_REFERENCE: "Unknown purok / household",
  DUPLICATE_EXISTING: "Duplicate of an existing resident",
  DUPLICATE_IN_FILE: "Duplicate of an earlier row in the file",
};

/** One problem found on one field of one row. `field` is "" for whole-record problems (duplicates). */
export interface ImportIssue {
  field: string;
  type: ImportErrorType;
  message: string;
}

/** The slice of a validated/previewed row these functions need. */
export interface MetricsRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: unknown;
  errors: string[];
  issues?: ImportIssue[];
  isDuplicate: boolean;
  possibleDuplicates?: DuplicateMatchInfo[];
}

// ─── summary ───────────────────────────────────────────────────────────────

export interface ImportSummary {
  /** N: rows read from the file. */
  total: number;

  // The four mutually-exclusive buckets (sum = total).
  invalid: number;
  duplicates: number;
  possibleDuplicates: number;
  ready: number;

  // Convenience / backwards-compatible aggregates.
  /** Rows with no blocking error (ready + possibleDuplicates). */
  valid: number;
  /** Rows with a blocking error (invalid + duplicates). */
  errors: number;
  /** Total field-level problems found (a row may contribute several). */
  issueCount: number;

  // Rates, in percent, one decimal. 0 when the file is empty.
  errorRate: number;
  validationErrorRate: number;
  duplicateRate: number;
  possibleDuplicateRate: number;

  /** Rows affected, per error type (all types present, zero-filled). */
  errorsByType: Record<ImportErrorType, number>;
  /** Rows affected, per field name (only fields that had a problem). */
  errorsByField: Record<string, number>;
}

/** n/d as a percentage rounded to one decimal; 0 when d is 0. */
export function percent(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

export function summarizeImport(rows: MetricsRow[]): ImportSummary {
  const total = rows.length;
  let invalid = 0;
  let duplicates = 0;
  let possible = 0;
  let issueCount = 0;

  const errorsByType = Object.fromEntries(IMPORT_ERROR_TYPES.map((t) => [t, 0])) as Record<ImportErrorType, number>;
  const errorsByField: Record<string, number> = {};

  for (const row of rows) {
    const hasError = row.errors.length > 0;
    if (hasError && row.isDuplicate) duplicates++;
    else if (hasError) invalid++;
    else if ((row.possibleDuplicates?.length ?? 0) > 0) possible++;

    if (!hasError) continue;

    // Rows affected: count each type / field once per row.
    const types = new Set<ImportErrorType>();
    const fields = new Set<string>();
    const issues = row.issues ?? [];
    issueCount += Math.max(issues.length, 1);
    for (const issue of issues) {
      types.add(issue.type);
      if (issue.field) fields.add(issue.field);
    }
    // Defensive: a row flagged as an error but with no structured issue (a
    // code path that forgot to record one) is still an error, not a gap.
    if (issues.length === 0) types.add(row.isDuplicate ? "DUPLICATE_EXISTING" : "INVALID_FORMAT");

    for (const t of types) errorsByType[t]++;
    for (const f of fields) errorsByField[f] = (errorsByField[f] ?? 0) + 1;
  }

  const errors = invalid + duplicates;
  return {
    total,
    invalid,
    duplicates,
    possibleDuplicates: possible,
    ready: total - errors - possible,
    valid: total - errors,
    errors,
    issueCount,
    errorRate: percent(errors, total),
    validationErrorRate: percent(invalid, total),
    duplicateRate: percent(duplicates, total),
    possibleDuplicateRate: percent(possible, total),
    errorsByType,
    errorsByField,
  };
}

// ─── CSV ───────────────────────────────────────────────────────────────────

// Values that look like plain numbers / phone numbers / dates may legitimately
// start with + or - and must not be altered (the report is meant to be
// corrected and re-uploaded).
const PLAIN_NUMERIC = /^[+-]?[\d\s().\-/]+$/;

/**
 * RFC-4180 quoting, plus spreadsheet formula-injection protection: a cell that
 * begins with = @ (or a tab/CR), or with +/- and isn't plainly numeric, gets a
 * leading apostrophe so Excel shows it as text instead of running it. The
 * report echoes values from an uploaded file, so we don't trust them.
 */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !PLAIN_NUMERIC.test(text))) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export type ReportStatus = "ERROR" | "DUPLICATE" | "POSSIBLE_DUPLICATE";

/**
 * Row-level report: one line per row that needs attention (error, duplicate
 * or possible duplicate), with what's wrong AND the original values, so the
 * file can be corrected and uploaded again. Clean rows are omitted.
 *
 * `rawColumns` are the template column keys (see residentImportColumns.ts);
 * they are used as headers so the corrected file re-imports as-is — the
 * leading Row/Status/Error columns are ignored by the importer.
 */
export function buildErrorReportCsv(rows: MetricsRow[], rawColumns: readonly string[]): string {
  const header = ["Row", "Status", "Error types", "Fields", "Problems", ...rawColumns];
  const lines = [csvLine(header)];

  for (const row of rows) {
    const hasError = row.errors.length > 0;
    const possible = row.possibleDuplicates ?? [];
    if (!hasError && possible.length === 0) continue;

    const status: ReportStatus = hasError ? (row.isDuplicate ? "DUPLICATE" : "ERROR") : "POSSIBLE_DUPLICATE";
    const issues = row.issues ?? [];

    const types = [...new Set(issues.map((i) => IMPORT_ERROR_TYPE_LABELS[i.type]))];
    const fields = [...new Set(issues.map((i) => i.field).filter(Boolean))];
    const problems = hasError
      ? row.errors
      : possible.map((m) => `${m.label}: looks like ${describeMatch(m)}`);

    lines.push(
      csvLine([
        row.rowNumber,
        status,
        status === "POSSIBLE_DUPLICATE" ? "Possible duplicate (warning)" : types.join("; "),
        fields.join("; "),
        problems.join(" | "),
        ...rawColumns.map((c) => row.raw[c] ?? ""),
      ])
    );
  }

  return lines.join("\r\n") + "\r\n";
}

/** Metric/value table for pasting into a report or thesis chapter. */
export function buildSummaryCsv(
  summary: ImportSummary,
  meta: { fileName?: string; generatedAt?: Date } = {}
): string {
  const pct = (n: number) => `${n}%`;
  const lines: unknown[][] = [
    ["Metric", "Value"],
    ["File", meta.fileName ?? ""],
    ["Generated", (meta.generatedAt ?? new Date()).toISOString()],
    ["Rows read (N)", summary.total],
    ["Ready to import", summary.ready],
    ["Possible duplicates (need review)", summary.possibleDuplicates],
    ["Invalid rows (failed validation)", summary.invalid],
    ["Exact duplicate rows (blocked)", summary.duplicates],
    ["Rows with an error (invalid + duplicate)", summary.errors],
    ["Field-level problems found", summary.issueCount],
    ["ERROR RATE = (invalid + duplicate) / N", pct(summary.errorRate)],
    ["Validation error rate = invalid / N", pct(summary.validationErrorRate)],
    ["Duplicate rate = duplicate / N", pct(summary.duplicateRate)],
    ["Possible-duplicate rate = possible / N", pct(summary.possibleDuplicateRate)],
    [],
    ["Rows affected by error type", "Rows"],
    ...IMPORT_ERROR_TYPES.map((t) => [IMPORT_ERROR_TYPE_LABELS[t], summary.errorsByType[t]]),
    [],
    ["Rows affected by field", "Rows"],
    ...Object.entries(summary.errorsByField)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([field, count]) => [field, count]),
  ];
  return lines.map(csvLine).join("\r\n") + "\r\n";
}