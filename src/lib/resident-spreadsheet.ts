// FILE: src/lib/resident-spreadsheet.ts
//
// Builds the two Excel files people download from the Residents pages:
//
//   - the import template  (GET /api/residents/import/template)
//   - the resident export  (GET /api/residents/export)
//
// Both share one layout, so an exported file can be corrected in Excel and
// imported again as it is:
//
//   row 1   title            (barangay name)
//   row 2   a one-line note
//   row 3   column headings  (navy, frozen; required ones marked *)
//   row 4+  one resident per row
//
// The template also has dropdowns for Sex, Civil Status and Purok (the
// barangay's real puroks), keeps Mobile No. as text so Excel can't drop
// the leading 0, and comes with an Instructions sheet.
//
// The importer (parseImportFile in residentImport.ts) finds the heading row
// by itself, so the title rows above it are fine.
//
// Server-only (exceljs is a Node library).

import ExcelJS from "exceljs";
import { RESIDENT_IMPORT_COLUMNS } from "./residentImportColumns";

const FONT = "Calibri";
const NAVY = "FF2348B0";
const NAVY_DARK = "FF1A3586";
const INK = "FF1F2937";
const MUTED = "FF6B7280";
const LINE = "FFD9DEE8";
const ZEBRA = "FFF5F7FB";

const HEADER_ROW = 3;
const FIRST_DATA_ROW = HEADER_ROW + 1;
/** Rows of the template that get dropdowns and formatting (matches the 500-row import limit). */
const TEMPLATE_ROWS = 500;

export const SEX_OPTIONS = ["Male", "Female"];
export const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated", "Live-in"];

const thin = { style: "thin" as const, color: { argb: LINE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

function colIndex(key: string) {
  return RESIDENT_IMPORT_COLUMNS.findIndex((c) => c.key === key) + 1;
}

function colLetter(n: number) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Barangay Records Management System";
  wb.created = new Date();
  return wb;
}

/** Title, note and heading rows, column widths, frozen header. */
function addResidentSheet(wb: ExcelJS.Workbook, title: string, note: string) {
  const ws = wb.addWorksheet("Residents", {
    views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: 2, showGridLines: false }],
    properties: { defaultRowHeight: 18 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const last = RESIDENT_IMPORT_COLUMNS.length;

  ws.columns = RESIDENT_IMPORT_COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  ws.mergeCells(1, 1, 1, last);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 15, bold: true, color: { argb: NAVY_DARK } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, last);
  const noteCell = ws.getCell(2, 1);
  noteCell.value = note;
  noteCell.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
  noteCell.alignment = { vertical: "top" };
  ws.getRow(2).height = 20;

  const header = ws.getRow(HEADER_ROW);
  RESIDENT_IMPORT_COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.required ? `${c.header} *` : c.header;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = { ...BORDER, bottom: { style: "medium", color: { argb: NAVY_DARK } } };
  });
  header.height = 26;

  ws.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  return ws;
}

/** Fonts, borders, formats and light striping for a data row. */
function styleDataRow(ws: ExcelJS.Worksheet, rowNumber: number) {
  const row = ws.getRow(rowNumber);
  const striped = (rowNumber - FIRST_DATA_ROW) % 2 === 1;
  row.height = 20;
  RESIDENT_IMPORT_COLUMNS.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.font = { name: FONT, size: 11, color: { argb: INK } };
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    if (striped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    if (c.key === "birthdate") cell.numFmt = "yyyy-mm-dd";
    if (c.key === "mobile" || c.key === "household_no") cell.numFmt = "@"; // text: keeps leading zeros
  });
}

function addListsSheet(wb: ExcelJS.Workbook, puroks: string[]) {
  const ws = wb.addWorksheet("Lists", { state: "veryHidden" });
  const columns: [string, string[]][] = [
    ["Sex", SEX_OPTIONS],
    ["Civil Status", CIVIL_STATUS_OPTIONS],
    ["Purok", puroks],
  ];
  columns.forEach(([name, values], i) => {
    ws.getCell(1, i + 1).value = name;
    values.forEach((v, r) => (ws.getCell(r + 2, i + 1).value = v));
  });
  const range = (col: number, count: number) =>
    `Lists!$${colLetter(col)}$2:$${colLetter(col)}$${Math.max(2, count + 1)}`;
  return { sex: range(1, SEX_OPTIONS.length), civil: range(2, CIVIL_STATUS_OPTIONS.length), purok: range(3, puroks.length) };
}

function addDropdowns(ws: ExcelJS.Worksheet, lists: { sex: string; civil: string; purok: string }, hasPuroks: boolean) {
  const lastRow = FIRST_DATA_ROW + TEMPLATE_ROWS - 1;
  const add = (key: string, formula: string, title: string, message: string) => {
    const col = colLetter(colIndex(key));
    for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
      ws.getCell(`${col}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: title,
        error: message,
      };
    }
  };
  add("sex", lists.sex, "Sex", "Pick Male or Female from the list.");
  add("civil_status", lists.civil, "Civil Status", "Pick one from the list.");
  if (hasPuroks) add("purok_name", lists.purok, "Purok", "Pick a purok from the list. New puroks are added in Settings first.");
}

function addInstructionsSheet(wb: ExcelJS.Workbook, barangay: string, puroks: string[]) {
  const ws = wb.addWorksheet("Instructions", {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = [{ width: 20 }, { width: 11 }, { width: 62 }, { width: 20 }];

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "How to fill in the resident import";
  ws.getCell("A1").font = { name: FONT, size: 15, bold: true, color: { argb: NAVY_DARK } };
  ws.getRow(1).height = 28;

  const steps = [
    "1.  Type one person per row on the Residents sheet, starting under the blue headings.",
    "2.  Columns marked * are required. Everything else can be left blank and added later.",
    "3.  Save the file (Excel .xlsx or .csv) and upload it on the Import Residents page.",
    "4.  You'll see a preview first. Nothing is saved until you confirm, and rows with problems are listed with the reason.",
    "Up to 500 people per file. A person already in the system (same name and birthdate) is skipped automatically.",
  ];
  steps.forEach((text, i) => {
    const r = 3 + i;
    ws.mergeCells(r, 1, r, 4);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = { name: FONT, size: 11, color: { argb: i === steps.length - 1 ? MUTED : INK }, italic: i === steps.length - 1 };
    cell.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(r).height = 20;
  });

  const top = 3 + steps.length + 1;
  const head = ws.getRow(top);
  ["Column", "Required", "What to enter", "Example"].forEach((h, i) => {
    const cell = head.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", indent: 1 };
    cell.border = BORDER;
  });
  head.height = 22;

  RESIDENT_IMPORT_COLUMNS.forEach((c, i) => {
    const row = ws.getRow(top + 1 + i);
    row.values = [c.header, c.required ? "Yes" : "", c.hint, c.example];
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      if (n > 4) return;
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      cell.font = { name: FONT, color: { argb: n === 4 ? MUTED : INK }, bold: n === 1 };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    });
    row.height = c.hint.length > 60 ? 32 : 20;
  });

  const after = top + RESIDENT_IMPORT_COLUMNS.length + 2;
  ws.getCell(after, 1).value = `Puroks in ${barangay || "this barangay"}`;
  ws.getCell(after, 1).font = { name: FONT, bold: true, color: { argb: NAVY_DARK } };
  ws.mergeCells(after + 1, 1, after + 1, 4);
  ws.getCell(after + 1, 1).value = puroks.length
    ? puroks.join(", ")
    : "No puroks have been set up yet. Add them in Settings → Puroks, or leave the Purok column blank.";
  ws.getCell(after + 1, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getCell(after + 1, 1).font = { name: FONT, color: { argb: INK } };
  ws.getRow(after + 1).height = 32;
}

function barangayTitle(barangay: string) {
  return barangay ? `Barangay ${barangay.replace(/^barangay\s+/i, "")} — Residents` : "Residents";
}

/** The import template: empty Residents sheet with dropdowns, plus Instructions. */
export async function buildImportTemplate(opts: { barangay: string; puroks: string[] }): Promise<Buffer> {
  const wb = newWorkbook();
  const ws = addResidentSheet(
    wb,
    barangayTitle(opts.barangay),
    "Import template. One person per row, starting under the headings. Columns marked * are required. See the Instructions tab."
  );
  for (let r = FIRST_DATA_ROW; r < FIRST_DATA_ROW + TEMPLATE_ROWS; r++) styleDataRow(ws, r);
  // Printing a blank template gives one page of empty rows, not all 500.
  ws.pageSetup.printArea = `A1:${colLetter(RESIDENT_IMPORT_COLUMNS.length)}${FIRST_DATA_ROW + 29}`;
  const lists = addListsSheet(wb, opts.puroks);
  addDropdowns(ws, lists, opts.puroks.length > 0);
  addInstructionsSheet(wb, opts.barangay, opts.puroks);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface ExportResident {
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: Date;
  sex: string;
  civil_status: string;
  place_of_birth: string | null;
  religion: string | null;
  employment_status: string | null;
  educational_attainment: string | null;
  occupation: string | null;
  income_bracket: string | null;
  mobile: string | null;
  email: string | null;
  purok: { name: string } | null;
  household: { household_no: string } | null;
}

const SEX_LABEL: Record<string, string> = { MALE: "Male", FEMALE: "Female" };
const CIVIL_LABEL: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  WIDOWED: "Widowed",
  SEPARATED: "Separated",
  LIVE_IN: "Live-in",
};

/** Residents in the template's layout, so the file can be edited and re-imported. */
export async function buildResidentExport(opts: {
  barangay: string;
  residents: ExportResident[];
  note: string;
}): Promise<Buffer> {
  const wb = newWorkbook();
  const ws = addResidentSheet(wb, barangayTitle(opts.barangay), opts.note);

  opts.residents.forEach((r, i) => {
    const rowNumber = FIRST_DATA_ROW + i;
    const values: Record<string, string | Date | null> = {
      fname: r.fname,
      lname: r.lname,
      mname: r.mname,
      name_extension: r.name_extension,
      // A date-only value at UTC midnight shows as that same calendar date in Excel.
      birthdate: new Date(Date.UTC(r.birthdate.getUTCFullYear(), r.birthdate.getUTCMonth(), r.birthdate.getUTCDate())),
      sex: SEX_LABEL[r.sex] ?? r.sex,
      civil_status: CIVIL_LABEL[r.civil_status] ?? r.civil_status,
      purok_name: r.purok?.name ?? null,
      household_no: r.household?.household_no ?? null,
      place_of_birth: r.place_of_birth,
      religion: r.religion,
      employment_status: r.employment_status,
      educational_attainment: r.educational_attainment,
      occupation: r.occupation,
      income_bracket: r.income_bracket,
      mobile: r.mobile,
      email: r.email,
    };
    const row = ws.getRow(rowNumber);
    RESIDENT_IMPORT_COLUMNS.forEach((c, n) => {
      row.getCell(n + 1).value = values[c.key] ?? null;
    });
    styleDataRow(ws, rowNumber);
  });

  if (opts.residents.length > 0) {
    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: RESIDENT_IMPORT_COLUMNS.length },
    };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}