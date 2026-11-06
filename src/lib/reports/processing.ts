// FILE: src/lib/reports/processing.ts
//
// Processing Time report (Nov 2026): how long each request took in the
// system, step by step, so it can be compared with timings of the manual
// process. Used by:
//   - the "processing" entry in src/lib/reports/definitions.ts (screen + PDF)
//   - GET /api/reports/processing/export (every request, as an Excel file)
//
// Steps (see src/lib/process-timing.ts for how they're recorded):
//   Encoding           form opened → saved
//   Waiting            filed → processing started   (certificates only)
//   Processing         processing started → released (certificates only)
//   Filed → released   (certificates only; also covers "release directly")
//   Total              form opened → done (released / ID printed / saved)
//
// No names are included: the reference number identifies each request, and
// a timing study doesn't need personal information.
//
// Server-only (Prisma).

import type { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { durationStats, formatDuration, minutes, span, type DurationStats } from "@/lib/process-timing";

type Db = Pick<PrismaClient, "certificate" | "barangayId" | "blotterCase" | "equipmentBorrowing">;

export const CERT_LABEL: Record<string, string> = {
  RESIDENCY: "Residency",
  INDIGENCY: "Indigency",
  CLEARANCE: "Barangay Clearance",
  GOOD_MORAL: "Good Moral",
  BUSINESS_PERMIT: "Business Permit",
  COHABITATION: "Cohabitation",
  SOLO_PARENT: "Solo Parent",
  FIRST_TIME_JOB_SEEKER: "First-Time Job Seeker",
  LATE_REGISTRATION: "Late Registration",
};

export type TimingKind = "certificate" | "barangay-id" | "blotter" | "borrowing";

export interface TimingRow {
  kind: TimingKind;
  /** "Barangay Clearance", "Barangay ID", "Blotter case", "Equipment borrowing" */
  document: string;
  reference: string;
  status: string;
  encodedBy: string;
  opened: Date | null;
  filed: Date;
  processingStarted: Date | null;
  printed: Date | null;
  /** Released (certificates) / when it was finished. */
  done: Date | null;
  encoding: number | null;
  waiting: number | null;
  processing: number | null;
  filedToDone: number | null;
  total: number | null;
}

const KIND_LABEL: Record<TimingKind, string> = {
  certificate: "Certificates",
  "barangay-id": "Barangay ID",
  blotter: "Blotter case",
  borrowing: "Equipment borrowing",
};

function title(code: string) {
  return code.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Every request filed in [gte, lt), oldest first, with its step times. */
export async function loadTimingRows(db: Db, range: { gte: Date; lt: Date }): Promise<TimingRow[]> {
  const [certs, ids, cases, borrowings] = await Promise.all([
    db.certificate.findMany({
      where: { requested_at: range },
      select: {
        queue_number: true, certificate_no: true, certificate_type: true, status: true,
        form_opened_at: true, requested_at: true, processing_started_at: true, printed_at: true, issued_at: true,
        issuer: { select: { username: true } },
      },
      orderBy: { requested_at: "asc" },
    }),
    db.barangayId.findMany({
      where: { issued_date: range },
      select: { id_number: true, form_opened_at: true, issued_date: true, printed_at: true, issuer: { select: { username: true } } },
      orderBy: { issued_date: "asc" },
    }),
    db.blotterCase.findMany({
      where: { created_at: range },
      select: { case_number: true, status: true, form_opened_at: true, created_at: true },
      orderBy: { created_at: "asc" },
    }),
    db.equipmentBorrowing.findMany({
      where: { created_at: range },
      select: { id: true, form_opened_at: true, created_at: true, actual_return: true, recorder: { select: { username: true } } },
      orderBy: { created_at: "asc" },
    }),
  ]);

  const rows: TimingRow[] = [];
  for (const c of certs) {
    const released = c.status === "RELEASED" ? c.issued_at : null;
    const started = c.processing_started_at;
    rows.push({
      kind: "certificate",
      document: CERT_LABEL[c.certificate_type] ?? title(c.certificate_type),
      reference: c.queue_number || c.certificate_no,
      status: title(c.status),
      encodedBy: c.issuer?.username ?? "",
      opened: c.form_opened_at,
      filed: c.requested_at,
      processingStarted: started,
      printed: c.printed_at,
      done: released,
      encoding: span(c.form_opened_at, c.requested_at),
      waiting: span(c.requested_at, started),
      processing: released ? span(started, released) : null,
      filedToDone: span(c.requested_at, released),
      total: released ? span(c.form_opened_at ?? c.requested_at, released) : null,
    });
  }
  for (const b of ids) {
    const done = b.printed_at ?? b.issued_date;
    rows.push({
      kind: "barangay-id",
      document: "Barangay ID",
      reference: b.id_number,
      status: b.printed_at ? "Printed" : "Issued",
      encodedBy: b.issuer?.username ?? "",
      opened: b.form_opened_at,
      filed: b.issued_date,
      processingStarted: null,
      printed: b.printed_at,
      done,
      encoding: span(b.form_opened_at, b.issued_date),
      waiting: null,
      processing: null,
      filedToDone: span(b.issued_date, b.printed_at),
      total: b.form_opened_at ? span(b.form_opened_at, done) : null,
    });
  }
  for (const k of cases) {
    const encoding = span(k.form_opened_at, k.created_at);
    rows.push({
      kind: "blotter",
      document: "Blotter case",
      reference: k.case_number,
      status: title(k.status),
      encodedBy: "",
      opened: k.form_opened_at,
      filed: k.created_at,
      processingStarted: null,
      printed: null,
      done: k.created_at,
      encoding,
      waiting: null,
      processing: null,
      filedToDone: null,
      total: encoding,
    });
  }
  for (const w of borrowings) {
    const encoding = span(w.form_opened_at, w.created_at);
    rows.push({
      kind: "borrowing",
      document: "Equipment borrowing",
      reference: `BRW-${String(w.id).padStart(5, "0")}`,
      status: w.actual_return ? "Returned" : "Out",
      encodedBy: w.recorder?.username ?? "",
      opened: w.form_opened_at,
      filed: w.created_at,
      processingStarted: null,
      printed: null,
      done: w.created_at,
      encoding,
      waiting: null,
      processing: null,
      filedToDone: null,
      total: encoding,
    });
  }
  return rows;
}

export interface TimingGroup {
  label: string;
  kind: TimingKind | "all-certificates";
  requests: number;
  encoding: DurationStats;
  waiting: DurationStats;
  processing: DurationStats;
  filedToDone: DurationStats;
  total: DurationStats;
}

function group(label: string, kind: TimingGroup["kind"], rows: TimingRow[]): TimingGroup {
  return {
    label,
    kind,
    requests: rows.length,
    encoding: durationStats(rows.map((r) => r.encoding)),
    waiting: durationStats(rows.map((r) => r.waiting)),
    processing: durationStats(rows.map((r) => r.processing)),
    filedToDone: durationStats(rows.map((r) => r.filedToDone)),
    total: durationStats(rows.map((r) => r.total)),
  };
}

/** One group per certificate type that has requests, then all certificates, then IDs, cases and borrowings. */
export function summarize(rows: TimingRow[]): TimingGroup[] {
  const certs = rows.filter((r) => r.kind === "certificate");
  const types = [...new Set(certs.map((r) => r.document))].sort();
  const groups = types.map((t) => group(t, "certificate", certs.filter((r) => r.document === t)));
  if (types.length > 1) groups.push(group("All certificates", "all-certificates", certs));
  for (const kind of ["barangay-id", "blotter", "borrowing"] as const) {
    const of = rows.filter((r) => r.kind === kind);
    if (of.length) groups.push(group(KIND_LABEL[kind], kind, of));
  }
  return groups;
}

export const TIMING_NOTE =
  "Encoding = from opening the form to saving it. Waiting = filed until someone pressed Start processing. " +
  "Processing = from then until released. Times are clock time, so waiting includes nights and weekends. " +
  "For Barangay IDs, the total runs until the ID was first printed. Requests saved before processing times " +
  "were added (Nov 2026) have no encoding time and are left out of those averages.";

// ─── Excel export ─────────────────────────────────────────────────────────

const FONT = "Calibri";
const NAVY = "FF1F3A93";
const NAVY_DARK = "FF162B6E";
const INK = "FF1F2937";
const MUTED = "FF6B7280";
const ZEBRA = "FFF4F6FB";
const LINE = { style: "thin" as const, color: { argb: "FFE5E7EB" } };
const BORDER = { top: LINE, left: LINE, bottom: LINE, right: LINE };

function sheetWithHeader(
  wb: ExcelJS.Workbook,
  name: string,
  heading: string,
  note: string,
  columns: { header: string; key: string; width: number }[]
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
  ws.mergeCells(1, 1, 1, columns.length);
  ws.getCell(1, 1).value = heading;
  ws.getCell(1, 1).font = { name: FONT, size: 15, bold: true, color: { argb: NAVY_DARK } };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(2, 1).value = note;
  ws.getCell(2, 1).font = { name: FONT, size: 9.5, italic: true, color: { argb: MUTED } };
  ws.getCell(2, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(2).height = 42;
  const header = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = BORDER;
  });
  header.height = 32;
  ws.pageSetup.printTitlesRow = "4:4";
  return ws;
}

function styleRow(row: ExcelJS.Row, striped: boolean, minuteCols: number[], dateCols: number[]) {
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.font = { name: FONT, size: 10.5, color: { argb: INK } };
    cell.border = BORDER;
    cell.alignment = { vertical: "middle" };
    if (striped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    if (minuteCols.includes(col)) cell.numFmt = "0.00";
    if (dateCols.includes(col)) cell.numFmt = "yyyy-mm-dd hh:mm:ss";
  });
}

/** Excel dates have no time zone; write Manila wall-clock time. */
function manila(d: Date | null): Date | null {
  return d ? new Date(d.getTime() + 8 * 3600000) : null;
}

export async function buildTimingWorkbook(opts: { barangay: string; periodLabel: string; exportedBy: string; rows: TimingRow[] }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Barangay Records Management System";
  wb.created = new Date();
  const exported = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  const note = `${opts.barangay} · ${opts.periodLabel} · exported ${exported} by ${opts.exportedBy}. Durations are in minutes. ${TIMING_NOTE}`;

  // Sheet 1: averages per document, ready to put beside the manual timings.
  const sumCols = [
    { header: "Document", key: "doc", width: 26 },
    { header: "Requests", key: "n", width: 10 },
    { header: "With encoding time", key: "timed", width: 12 },
    { header: "Avg. encoding (min)", key: "enc", width: 13 },
    { header: "Median encoding (min)", key: "encMed", width: 13 },
    { header: "Avg. waiting (min)", key: "wait", width: 13 },
    { header: "Avg. processing (min)", key: "proc", width: 13 },
    { header: "Avg. filed → released (min)", key: "ftd", width: 15 },
    { header: "Avg. total (min)", key: "tot", width: 12 },
    { header: "Median total (min)", key: "totMed", width: 12 },
    { header: "Fastest total (min)", key: "fast", width: 12 },
    { header: "Slowest total (min)", key: "slow", width: 12 },
    { header: "Manual process (min) — fill in", key: "manual", width: 16 },
    { header: "Difference (min)", key: "diff", width: 13 },
  ];
  const sum = sheetWithHeader(wb, "Summary", "Processing Time — Summary", note, sumCols);
  summarize(opts.rows).forEach((g, i) => {
    const r = sum.addRow({
      doc: g.label,
      n: g.requests,
      timed: g.encoding.count,
      enc: minutes(g.encoding.average),
      encMed: minutes(g.encoding.median),
      wait: minutes(g.waiting.average),
      proc: minutes(g.processing.average),
      ftd: minutes(g.filedToDone.average),
      tot: minutes(g.total.average),
      totMed: minutes(g.total.median),
      fast: minutes(g.total.fastest),
      slow: minutes(g.total.slowest),
      manual: null,
    });
    // Difference = manual − system average total, once the manual time is typed in.
    const rn = r.number;
    r.getCell("diff").value = { formula: `IF(OR(M${rn}="",I${rn}=""),"",M${rn}-I${rn})` };
    styleRow(r, i % 2 === 1, [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], []);
    if (g.kind === "all-certificates") r.font = { name: FONT, size: 10.5, bold: true, color: { argb: INK } };
    r.getCell("manual").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } };
  });

  // Sheet 2: every request.
  const reqCols = [
    { header: "Reference", key: "ref", width: 18 },
    { header: "Document", key: "doc", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Encoded by", key: "by", width: 14 },
    { header: "Form opened", key: "opened", width: 19 },
    { header: "Filed / saved", key: "filed", width: 19 },
    { header: "Processing started", key: "started", width: 19 },
    { header: "First printed", key: "printed", width: 19 },
    { header: "Released / done", key: "done", width: 19 },
    { header: "Encoding (min)", key: "enc", width: 11 },
    { header: "Waiting (min)", key: "wait", width: 11 },
    { header: "Processing (min)", key: "proc", width: 11 },
    { header: "Filed → released (min)", key: "ftd", width: 13 },
    { header: "Total (min)", key: "tot", width: 11 },
  ];
  const all = sheetWithHeader(wb, "Requests", "Processing Time — Each Request", note, reqCols);
  opts.rows.forEach((x, i) => {
    const r = all.addRow({
      ref: x.reference,
      doc: x.document,
      status: x.status,
      by: x.encodedBy,
      opened: manila(x.opened),
      filed: manila(x.filed),
      started: manila(x.processingStarted),
      printed: manila(x.printed),
      done: manila(x.done),
      enc: minutes(x.encoding),
      wait: minutes(x.waiting),
      proc: minutes(x.processing),
      ftd: minutes(x.filedToDone),
      tot: minutes(x.total),
    });
    styleRow(r, i % 2 === 1, [10, 11, 12, 13, 14], [5, 6, 7, 8, 9]);
  });
  all.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: reqCols.length } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export { formatDuration };