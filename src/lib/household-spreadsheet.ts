// FILE: src/lib/household-spreadsheet.ts
//
// Households as a formatted Excel file (Nov 2026), replacing the plain BIMS
// CSV. Same look as the Residents export (src/lib/resident-spreadsheet.ts):
// barangay title, a note row, a navy heading row, frozen header and first
// column, light striping, filters on every column, landscape A4 printing.
//
// Two sheets:
//   Households  one row per household (the old BIMS columns, in words)
//   Members     one row per member, with their household number, so the
//               file can be sorted or filtered by person as well
//
// Stored codes are written in words: OWN → Own, ELECTRIC_METERED →
// Electric (metered), OTHER → the text that was typed for "Other".

import ExcelJS from "exceljs";

const FONT = "Calibri";
const NAVY = "FF2348B0";
const NAVY_DARK = "FF1A3586";
const INK = "FF1F2937";
const MUTED = "FF6B7280";
const LINE = "FFD9DEE8";
const ZEBRA = "FFF5F7FB";

const HEADER_ROW = 3;
const FIRST_DATA_ROW = HEADER_ROW + 1;

const thin = { style: "thin" as const, color: { argb: LINE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

// ─── Input shape (what the export route loads) ───────────────────────────────
export interface ExportMember {
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: Date;
  sex: string;
  civil_status: string;
}

export interface ExportHousehold {
  household_no: string;
  address: string;
  purok: { name: string } | null;
  household_head: ExportMember | null;
  household_head_id: number | null;
  members: (ExportMember & { id: number })[];
  no_of_families: number | null;
  housing_type: string | null;
  housing_type_other: string | null;
  tenure_status: string | null;
  tenure_other: string | null;
  household_unit: string | null;
  household_unit_other: string | null;
  water_source: string | null;
  waste_disposal: string | null;
  power_supply: string | null;
  comfort_room: string | null;
  monthly_income: { toString(): string } | number | null;
  created_at: Date;
}

// ─── Wording ────────────────────────────────────────────────────────────────
const WORDS: Record<string, string> = {
  OWN: "Own",
  RENT: "Rent",
  SHARED: "Shared",
  INFORMAL: "Informal settler",
  NONE: "None",
  OWNER: "Owner",
  RENTER: "Renter",
  CARETAKER: "Caretaker",
  SHARER: "Sharer",
  SINGLE_HOUSE: "Single house",
  DUPLEX: "Duplex",
  APARTMENT: "Apartment",
  INDIVIDUAL: "Individual",
  COMMUNAL: "Communal",
  WELL: "Well",
  COLLECTED: "Collected",
  BURNED: "Burned",
  BURIED: "Buried",
  COMPOSTED: "Composted",
  ELECTRIC_METERED: "Electric (metered)",
  ELECTRIC_SHARED: "Electric (shared)",
  SOLAR: "Solar",
  MALE: "Male",
  FEMALE: "Female",
  SINGLE: "Single",
  MARRIED: "Married",
  WIDOWED: "Widowed",
  SEPARATED: "Separated",
  LIVE_IN: "Live-in",
  OTHER: "Other",
};

function words(code: string | null, other?: string | null): string | null {
  if (!code) return null;
  if (code === "OTHER") return other?.trim() || "Other";
  return WORDS[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ");
}

function personName(m: ExportMember) {
  const ext = m.name_extension ? ` ${m.name_extension}` : "";
  const mi = m.mname ? ` ${m.mname[0]}.` : "";
  return `${m.lname}, ${m.fname}${ext}${mi}`;
}

/** A date-only value at UTC midnight shows as that same calendar date in Excel. */
function excelDate(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function ageOn(birth: Date, on: Date) {
  let age = on.getFullYear() - birth.getFullYear();
  const m = on.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Sheet layout ────────────────────────────────────────────────────────────
type Kind = "text" | "code" | "int" | "peso" | "date";
interface Column {
  key: string;
  header: string;
  width: number;
  kind?: Kind;
}

const HOUSEHOLD_COLUMNS: Column[] = [
  { key: "household_no", header: "Household no.", width: 18, kind: "code" },
  { key: "head", header: "Household head", width: 28 },
  { key: "purok", header: "Purok", width: 12 },
  { key: "address", header: "Address", width: 34 },
  { key: "members", header: "Members", width: 10, kind: "int" },
  { key: "families", header: "Families", width: 10, kind: "int" },
  { key: "housing", header: "Housing type", width: 16 },
  { key: "tenure", header: "Tenure", width: 14 },
  { key: "unit", header: "Unit type", width: 15 },
  { key: "water", header: "Water source", width: 15 },
  { key: "waste", header: "Waste disposal", width: 15 },
  { key: "power", header: "Power supply", width: 18 },
  { key: "cr", header: "Comfort room", width: 14 },
  { key: "income", header: "Monthly income", width: 16, kind: "peso" },
  { key: "registered", header: "Registered", width: 13, kind: "date" },
];

const MEMBER_COLUMNS: Column[] = [
  { key: "household_no", header: "Household no.", width: 18, kind: "code" },
  { key: "name", header: "Name", width: 30 },
  { key: "role", header: "Role", width: 18 },
  { key: "sex", header: "Sex", width: 10 },
  { key: "birthdate", header: "Birthdate", width: 13, kind: "date" },
  { key: "age", header: "Age", width: 8, kind: "int" },
  { key: "civil", header: "Civil status", width: 14 },
  { key: "purok", header: "Purok", width: 12 },
];

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Column[], title: string, note: string) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: 1, showGridLines: false }],
    properties: { defaultRowHeight: 18 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 15, bold: true, color: { argb: NAVY_DARK } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, columns.length);
  const noteCell = ws.getCell(2, 1);
  noteCell.value = note;
  noteCell.font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
  noteCell.alignment = { vertical: "top" };
  ws.getRow(2).height = 20;

  const header = ws.getRow(HEADER_ROW);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: c.kind === "int" || c.kind === "peso" ? "right" : "left", indent: 1 };
    cell.border = { ...BORDER, bottom: { style: "medium", color: { argb: NAVY_DARK } } };
  });
  header.height = 26;
  ws.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  return ws;
}

function writeRows(ws: ExcelJS.Worksheet, columns: Column[], rows: Record<string, unknown>[]) {
  rows.forEach((values, i) => {
    const rowNumber = FIRST_DATA_ROW + i;
    const row = ws.getRow(rowNumber);
    row.height = 20;
    const striped = i % 2 === 1;
    columns.forEach((c, n) => {
      const cell = row.getCell(n + 1);
      cell.value = (values[c.key] ?? null) as ExcelJS.CellValue;
      cell.font = { name: FONT, size: 11, color: { argb: INK } };
      cell.border = BORDER;
      const right = c.kind === "int" || c.kind === "peso";
      cell.alignment = { vertical: "middle", horizontal: right ? "right" : "left", indent: 1 };
      if (striped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      if (c.kind === "code") cell.numFmt = "@"; // text: keeps leading zeros
      if (c.kind === "date") cell.numFmt = "yyyy-mm-dd";
      if (c.kind === "peso") cell.numFmt = '"₱"#,##0.00';
      if (c.kind === "int") cell.numFmt = "0";
    });
  });
  if (rows.length > 0) {
    ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: columns.length } };
  }
}

// ─── Build ───────────────────────────────────────────────────────────────────
export async function buildHouseholdExport(opts: {
  barangay: string;
  households: ExportHousehold[];
  note: string;
  now?: Date;
}): Promise<Buffer> {
  const now = opts.now ?? new Date();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Barangay Records Management System";
  wb.created = now;

  // Same title wording as the Residents export.
  const name = opts.barangay.trim().replace(/^barangay\s+/i, "");
  const brgy = name ? `Barangay ${name}` : "Barangay";

  const households = addSheet(wb, "Households", HOUSEHOLD_COLUMNS, `${brgy} — Households`, opts.note);
  writeRows(
    households,
    HOUSEHOLD_COLUMNS,
    opts.households.map((h) => ({
      household_no: h.household_no,
      head: h.household_head ? personName(h.household_head) : null,
      purok: h.purok?.name ?? null,
      address: h.address,
      members: h.members.length,
      families: h.no_of_families,
      housing: words(h.housing_type, h.housing_type_other),
      tenure: words(h.tenure_status, h.tenure_other),
      unit: words(h.household_unit, h.household_unit_other),
      water: words(h.water_source),
      waste: words(h.waste_disposal),
      power: words(h.power_supply),
      cr: words(h.comfort_room),
      income: h.monthly_income === null || h.monthly_income === undefined ? null : Number(h.monthly_income.toString()),
      registered: excelDate(h.created_at),
    }))
  );

  const memberRows: Record<string, unknown>[] = [];
  for (const h of opts.households) {
    // Head first, then everyone else by name.
    const sorted = [...h.members].sort((a, b) => {
      const ah = a.id === h.household_head_id ? 0 : 1;
      const bh = b.id === h.household_head_id ? 0 : 1;
      return ah - bh || personName(a).localeCompare(personName(b));
    });
    for (const m of sorted) {
      memberRows.push({
        household_no: h.household_no,
        name: personName(m),
        role: m.id === h.household_head_id ? "Household head" : "Member",
        sex: words(m.sex),
        birthdate: excelDate(m.birthdate),
        age: ageOn(m.birthdate, now),
        civil: words(m.civil_status),
        purok: h.purok?.name ?? null,
      });
    }
  }
  const members = addSheet(
    wb,
    "Members",
    MEMBER_COLUMNS,
    `${brgy} — Household members`,
    `${memberRows.length} member${memberRows.length === 1 ? "" : "s"} of the households on the first sheet.`
  );
  writeRows(members, MEMBER_COLUMNS, memberRows);

  return Buffer.from(await wb.xlsx.writeBuffer());
}