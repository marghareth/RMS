// FILE: src/lib/reports/definitions.ts
//
// The reports that didn't exist yet (Nov 2026), defined once and used in
// two places:
//   - GET /api/reports/[type]       → JSON for the on-screen report page
//                                      (src/app/(dashboard)/reports/[type]/page.tsx)
//   - GET /api/pdf/report/[type]    → the same numbers as a PDF
//                                      (src/lib/pdf/GenericReportPDF.tsx)
// so what's on screen and what's printed can never disagree.
//
// Each report returns headline figures (stats), a few breakdowns to chart,
// and tables. The period is a year, optionally narrowed to a month; reports
// that describe the barangay "as of today" (households, officials, finance
// balances) say so in their period label.
//
// Server-only (Prisma).

import type { PrismaClient } from "@prisma/client";
import { loadTimingRows, summarize, TIMING_NOTE } from "@/lib/reports/processing";
import { formatDuration } from "@/lib/process-timing";

export interface ReportStat {
  label: string;
  value: string;
  hint?: string;
}

export interface ReportChart {
  title: string;
  kind: "bar" | "pie";
  data: { name: string; value: number }[];
}

export interface ReportTable {
  title: string;
  columns: { header: string; align?: "left" | "right" }[];
  rows: string[][];
  /** Shown under the table, e.g. "Showing the latest 100 of 412." */
  note?: string;
}

export interface ReportData {
  type: string;
  title: string;
  description: string;
  periodLabel: string;
  stats: ReportStat[];
  charts: ReportChart[];
  tables: ReportTable[];
}

export interface ReportPeriod {
  year: number;
  /** 1–12, or null for the whole year. */
  month: number | null;
}

type Db = Pick<
  PrismaClient,
  | "household"
  | "resident"
  | "purok"
  | "healthRecord"
  | "vaccination"
  | "deceasedRecord"
  | "brgyOfficial"
  | "visitorLog"
  | "meetingRecord"
  | "agendaItem"
  | "barangayId"
  | "revenue"
  | "disbursement"
  | "appropriation"
  | "fundSource"
  | "certificate"
  | "blotterCase"
  | "equipmentBorrowing"
>;

// ─── helpers ──────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ROW_LIMIT = 100;

/** Start (inclusive) and end (exclusive) of the period, Philippine time. */
export function periodRange(p: ReportPeriod): { gte: Date; lt: Date } {
  const start = p.month ? `${p.year}-${String(p.month).padStart(2, "0")}-01` : `${p.year}-01-01`;
  const endYear = p.month ? (p.month === 12 ? p.year + 1 : p.year) : p.year + 1;
  const endMonth = p.month ? (p.month === 12 ? 1 : p.month + 1) : 1;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  return { gte: new Date(`${start}T00:00:00+08:00`), lt: new Date(`${end}T00:00:00+08:00`) };
}

export function periodLabel(p: ReportPeriod): string {
  return p.month ? `${MONTH_NAMES[p.month - 1]} ${p.year}` : `January – December ${p.year}`;
}

const count = (n: number) => n.toLocaleString("en-PH");
const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
}

function label(code: string | null | undefined): string {
  if (!code) return "Not stated";
  return code
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type NameParts = { fname: string; lname: string; mname: string | null; name_extension: string | null };
function personName(r: NameParts | null | undefined): string {
  if (!r) return "—";
  return `${r.lname}, ${r.fname}${r.name_extension ? ` ${r.name_extension}` : ""}${r.mname ? ` ${r.mname[0]}.` : ""}`;
}

function ageAt(birth: Date, on: Date): number {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/** Counts by a key, largest first. */
function tally<T>(items: T[], key: (t: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) map.set(key(it), (map.get(key(it)) ?? 0) + 1);
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Sums by a key, largest first. */
function sumBy<T>(items: T[], key: (t: T) => string, amount: (t: T) => number): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) map.set(key(it), (map.get(key(it)) ?? 0) + amount(it));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** One bar per month of the year (or per day of the month). */
function byMonth<T>(items: T[], date: (t: T) => Date, p: ReportPeriod): { name: string; value: number }[] {
  if (p.month) {
    const days = new Date(p.year, p.month, 0).getDate();
    const out = Array.from({ length: days }, (_, i) => ({ name: String(i + 1), value: 0 }));
    for (const it of items) {
      const d = Number(date(it).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(8, 10));
      out[d - 1].value++;
    }
    return out;
  }
  const out = MONTHS.map((name) => ({ name, value: 0 }));
  for (const it of items) {
    const m = Number(date(it).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(5, 7));
    out[m - 1].value++;
  }
  return out;
}

function tableOf(title: string, headers: string[], data: { name: string; value: number }[], valueHeader = "Count") {
  const total = data.reduce((s, d) => s + d.value, 0);
  return {
    title,
    columns: [{ header: headers[0] }, { header: valueHeader, align: "right" as const }, { header: "Share", align: "right" as const }],
    rows: data.map((d) => [d.name, count(d.value), pct(d.value, total)]),
  };
}

function limitNote(shown: number, total: number) {
  return total > shown ? `Showing the latest ${shown} of ${count(total)}.` : undefined;
}

// ─── reports ──────────────────────────────────────────────────────────────

async function households(db: Db): Promise<Omit<ReportData, "type">> {
  const [rows, puroks, withoutHousehold] = await Promise.all([
    db.household.findMany({
      include: {
        purok: { select: { name: true } },
        household_head: { select: { fname: true, lname: true, mname: true, name_extension: true } },
        _count: { select: { members: true } },
      },
      orderBy: { household_no: "asc" },
    }),
    db.purok.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    db.resident.count({ where: { household_id: null, is_archived: false, is_deceased: false } }),
  ]);
  const members = rows.reduce((s, h) => s + h._count.members, 0);
  const byPurok = puroks.map((p) => ({
    name: p.name,
    households: rows.filter((h) => h.purok?.name === p.name).length,
    members: rows.filter((h) => h.purok?.name === p.name).reduce((s, h) => s + h._count.members, 0),
  }));
  const income = rows.map((h) => (h.monthly_income == null ? null : Number(h.monthly_income))).filter((n): n is number => n !== null);

  return {
    title: "Households Report",
    description: "Households by purok, size, housing and utilities",
    periodLabel: `As of ${fmtDate(new Date())}`,
    stats: [
      { label: "Households", value: count(rows.length) },
      { label: "Household members", value: count(members) },
      { label: "Average size", value: rows.length ? (members / rows.length).toFixed(1) : "—" },
      { label: "Without a head", value: count(rows.filter((h) => !h.household_head_id).length) },
      { label: "Residents with no household", value: count(withoutHousehold) },
      {
        label: "Average monthly income",
        value: income.length ? peso(income.reduce((a, b) => a + b, 0) / income.length) : "—",
        hint: income.length ? `from ${count(income.length)} households that gave one` : undefined,
      },
    ],
    charts: [
      { title: "Households per purok", kind: "bar", data: byPurok.map((p) => ({ name: p.name, value: p.households })) },
      { title: "Housing type", kind: "pie", data: tally(rows, (h) => label(h.housing_type)) },
      { title: "Water source", kind: "pie", data: tally(rows, (h) => label(h.water_source)) },
      { title: "Toilet facility", kind: "pie", data: tally(rows, (h) => label(h.comfort_room)) },
    ],
    tables: [
      {
        title: "By purok",
        columns: [{ header: "Purok" }, { header: "Households", align: "right" }, { header: "Members", align: "right" }, { header: "Avg. size", align: "right" }],
        rows: byPurok.map((p) => [p.name, count(p.households), count(p.members), p.households ? (p.members / p.households).toFixed(1) : "—"]),
      },
      tableOf("Power supply", ["Power supply"], tally(rows, (h) => label(h.power_supply))),
      tableOf("Waste disposal", ["Waste disposal"], tally(rows, (h) => label(h.waste_disposal))),
      tableOf("Tenure status", ["Tenure"], tally(rows, (h) => label(h.tenure_status))),
      {
        title: "Household list",
        columns: [{ header: "Household No." }, { header: "Purok" }, { header: "Head" }, { header: "Members", align: "right" }],
        rows: rows.slice(0, ROW_LIMIT * 3).map((h) => [h.household_no, h.purok?.name ?? "—", personName(h.household_head), count(h._count.members)]),
        note: rows.length > ROW_LIMIT * 3 ? `Showing ${ROW_LIMIT * 3} of ${count(rows.length)}.` : undefined,
      },
    ],
  };
}

async function health(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const range = periodRange(p);
  const resident = { select: { fname: true, lname: true, mname: true, name_extension: true, birthdate: true, sex: true, purok: { select: { name: true } } } };
  const [records, vaccinations] = await Promise.all([
    db.healthRecord.findMany({ where: { recorded_at: range }, include: { resident }, orderBy: { recorded_at: "desc" } }),
    db.vaccination.findMany({ where: { date_given: range }, include: { resident }, orderBy: { date_given: "desc" } }),
  ]);
  const people = new Set([...records.map((r) => r.resident_id), ...vaccinations.map((v) => v.resident_id)]);
  const children = vaccinations.filter((v) => ageAt(v.resident.birthdate, v.date_given) < 5).length;

  return {
    title: "Health Report",
    description: "Health records and vaccinations",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Health records", value: count(records.length) },
      { label: "Vaccinations given", value: count(vaccinations.length) },
      { label: "Residents served", value: count(people.size) },
      { label: "Vaccinations, under 5", value: count(children) },
    ],
    charts: [
      { title: p.month ? "Vaccinations per day" : "Vaccinations per month", kind: "bar", data: byMonth(vaccinations, (v) => v.date_given, p) },
      { title: "Vaccines given", kind: "pie", data: tally(vaccinations, (v) => v.vaccine_name).slice(0, 8) },
      { title: "Health record types", kind: "pie", data: tally(records, (r) => r.record_type).slice(0, 8) },
    ],
    tables: [
      tableOf("Vaccines given", ["Vaccine"], tally(vaccinations, (v) => v.vaccine_name)),
      tableOf("Health records by type", ["Record type"], tally(records, (r) => r.record_type)),
      tableOf("Vaccinations by purok", ["Purok"], tally(vaccinations, (v) => v.resident.purok?.name ?? "No purok")),
      {
        title: "Vaccinations",
        columns: [{ header: "Date" }, { header: "Resident" }, { header: "Age", align: "right" }, { header: "Vaccine" }],
        rows: vaccinations.slice(0, ROW_LIMIT).map((v) => [fmtDate(v.date_given), personName(v.resident), String(ageAt(v.resident.birthdate, v.date_given)), v.vaccine_name]),
        note: limitNote(Math.min(ROW_LIMIT, vaccinations.length), vaccinations.length),
      },
    ],
  };
}

async function deceased(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const rows = await db.deceasedRecord.findMany({
    where: { date_of_death: periodRange(p) },
    include: { resident: { select: { fname: true, lname: true, mname: true, name_extension: true, birthdate: true, sex: true, purok: { select: { name: true } } } } },
    orderBy: { date_of_death: "desc" },
  });
  const ageGroup = (age: number) =>
    age < 1 ? "Under 1" : age < 5 ? "1–4" : age < 18 ? "5–17" : age < 40 ? "18–39" : age < 60 ? "40–59" : "60 and over";
  const ages = rows.map((r) => ageAt(r.resident.birthdate, r.date_of_death));

  return {
    title: "Deaths Report",
    description: "Recorded deaths by cause, age and purok",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Deaths recorded", value: count(rows.length) },
      { label: "Male", value: count(rows.filter((r) => r.resident.sex === "MALE").length) },
      { label: "Female", value: count(rows.filter((r) => r.resident.sex === "FEMALE").length) },
      { label: "Average age", value: ages.length ? String(Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)) : "—" },
    ],
    charts: [
      { title: p.month ? "Deaths per day" : "Deaths per month", kind: "bar", data: byMonth(rows, (r) => r.date_of_death, p) },
      { title: "Age at death", kind: "pie", data: tally(ages, ageGroup) },
    ],
    tables: [
      tableOf("Immediate cause", ["Cause"], tally(rows, (r) => r.immediate_cause.trim() || "Not stated")),
      tableOf("Age at death", ["Age group"], tally(ages, ageGroup)),
      tableOf("By purok", ["Purok"], tally(rows, (r) => r.resident.purok?.name ?? "No purok")),
      {
        title: "Deaths",
        columns: [{ header: "Date of death" }, { header: "Name" }, { header: "Age", align: "right" }, { header: "Cause" }],
        rows: rows.slice(0, ROW_LIMIT).map((r, i) => [fmtDate(r.date_of_death), personName(r.resident), String(ages[i]), r.immediate_cause]),
        note: limitNote(Math.min(ROW_LIMIT, rows.length), rows.length),
      },
    ],
  };
}

async function officials(db: Db): Promise<Omit<ReportData, "type">> {
  const rows = await db.brgyOfficial.findMany({
    include: { resident: { select: { fname: true, lname: true, mname: true, name_extension: true } } },
    orderBy: [{ is_active: "desc" }, { term_start: "desc" }],
  });
  const now = new Date();
  const soon = new Date(now.getTime() + 90 * 86400000);
  const active = rows.filter((o) => o.is_active);
  const endingSoon = active.filter((o) => o.term_end && o.term_end >= now && o.term_end <= soon);

  return {
    title: "Officials Report",
    description: "Barangay officials, positions and terms",
    periodLabel: `As of ${fmtDate(now)}`,
    stats: [
      { label: "Active officials", value: count(active.length) },
      { label: "Past officials", value: count(rows.length - active.length) },
      { label: "Terms ending in 90 days", value: count(endingSoon.length) },
      { label: "No term end set", value: count(active.filter((o) => !o.term_end).length) },
    ],
    charts: [{ title: "Active officials by position", kind: "bar", data: tally(active, (o) => o.position) }],
    tables: [
      {
        title: "Active officials",
        columns: [{ header: "Position" }, { header: "Name" }, { header: "Assignment" }, { header: "Term" }, { header: "Contact" }],
        rows: active.map((o) => [o.position, personName(o.resident), o.purok_assignment ?? "—", `${fmtDate(o.term_start)} – ${o.term_end ? fmtDate(o.term_end) : "present"}`, o.contact_no ?? "—"]),
      },
      {
        title: "Terms ending in the next 90 days",
        columns: [{ header: "Position" }, { header: "Name" }, { header: "Term ends" }],
        rows: endingSoon.map((o) => [o.position, personName(o.resident), fmtDate(o.term_end)]),
      },
      {
        title: "Past officials",
        columns: [{ header: "Position" }, { header: "Name" }, { header: "Term" }],
        rows: rows.filter((o) => !o.is_active).slice(0, ROW_LIMIT).map((o) => [o.position, personName(o.resident), `${fmtDate(o.term_start)} – ${fmtDate(o.term_end)}`]),
      },
    ],
  };
}

async function visitors(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const rows = await db.visitorLog.findMany({ where: { time_in: periodRange(p) }, orderBy: { time_in: "desc" } });
  const durations = rows.filter((v) => v.time_out).map((v) => (v.time_out!.getTime() - v.time_in.getTime()) / 60000);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const hour = (d: Date) => Number(d.toLocaleTimeString("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7).map((h) => ({
    name: `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`,
    value: rows.filter((v) => hour(v.time_in) === h).length,
  }));

  return {
    title: "Visitor Log Report",
    description: "Visits by purpose, office and time of day",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Visits", value: count(rows.length) },
      { label: "Average visit", value: avg === null ? "—" : avg < 60 ? `${avg} min` : `${(avg / 60).toFixed(1)} hr` },
      { label: "Not checked out", value: count(rows.filter((v) => !v.time_out).length) },
      { label: "Busiest hour", value: rows.length ? [...hours].sort((a, b) => b.value - a.value)[0].name : "—" },
    ],
    charts: [
      { title: p.month ? "Visits per day" : "Visits per month", kind: "bar", data: byMonth(rows, (v) => v.time_in, p) },
      { title: "Visits by hour (7am–6pm)", kind: "bar", data: hours },
    ],
    tables: [
      tableOf("Purpose of visit", ["Purpose"], tally(rows, (v) => v.purpose.trim()).slice(0, 20)),
      tableOf("Person / office visited", ["Visited"], tally(rows, (v) => v.person_to_visit?.trim() || "Not stated").slice(0, 20)),
      {
        title: "Visits",
        columns: [{ header: "Date" }, { header: "In" }, { header: "Out" }, { header: "Visitor" }, { header: "Purpose" }],
        rows: rows.slice(0, ROW_LIMIT).map((v) => [fmtDate(v.time_in), fmtTime(v.time_in), fmtTime(v.time_out), v.visitor_name, v.purpose]),
        note: limitNote(Math.min(ROW_LIMIT, rows.length), rows.length),
      },
    ],
  };
}

async function meetings(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const range = periodRange(p);
  const [rows, items] = await Promise.all([
    db.meetingRecord.findMany({ where: { meeting_date: range }, include: { _count: { select: { agenda_items: true } } }, orderBy: { meeting_date: "desc" } }),
    db.agendaItem.findMany({ where: { meeting: { meeting_date: range } }, select: { status: true } }),
  ]);
  const completed = rows.filter((m) => m.status === "COMPLETED");

  return {
    title: "Meetings Report",
    description: "Sessions and assemblies, agenda and minutes",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Meetings", value: count(rows.length) },
      { label: "Completed", value: count(completed.length) },
      { label: "Completed without minutes", value: count(completed.filter((m) => !m.minutes?.trim()).length) },
      { label: "Agenda items approved", value: `${count(items.filter((i) => i.status === "APPROVED").length)} of ${count(items.length)}` },
    ],
    charts: [
      { title: "By type", kind: "pie", data: tally(rows, (m) => label(m.meeting_type)) },
      { title: "By status", kind: "pie", data: tally(rows, (m) => label(m.status)) },
    ],
    tables: [
      tableOf("Agenda items by status", ["Status"], tally(items, (i) => label(i.status))),
      {
        title: "Meetings",
        columns: [{ header: "Date" }, { header: "Type" }, { header: "Title" }, { header: "Status" }, { header: "Agenda", align: "right" }, { header: "Minutes" }],
        rows: rows.slice(0, ROW_LIMIT).map((m) => [fmtDate(m.meeting_date), label(m.meeting_type), m.title ?? "—", label(m.status), count(m._count.agenda_items), m.minutes?.trim() ? "Yes" : "No"]),
        note: limitNote(Math.min(ROW_LIMIT, rows.length), rows.length),
      },
    ],
  };
}

async function barangayIds(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const rows = await db.barangayId.findMany({
    where: { issued_date: periodRange(p) },
    include: {
      resident: { select: { fname: true, lname: true, mname: true, name_extension: true, sex: true, purok: { select: { name: true } } } },
      issuer: { select: { username: true } },
    },
    orderBy: { issued_date: "desc" },
  });
  const people = new Set(rows.map((r) => r.resident_id));

  return {
    title: "Barangay ID Report",
    description: "IDs issued by month, purok and issuer",
    periodLabel: periodLabel(p),
    stats: [
      { label: "IDs issued", value: count(rows.length) },
      { label: "Residents", value: count(people.size) },
      { label: "Replacements", value: count(rows.length - people.size), hint: "a second ID for the same resident" },
    ],
    charts: [
      { title: p.month ? "Issued per day" : "Issued per month", kind: "bar", data: byMonth(rows, (r) => r.issued_date, p) },
      { title: "By purok", kind: "pie", data: tally(rows, (r) => r.resident.purok?.name ?? "No purok") },
    ],
    tables: [
      tableOf("By purok", ["Purok"], tally(rows, (r) => r.resident.purok?.name ?? "No purok")),
      tableOf("Issued by", ["Staff"], tally(rows, (r) => r.issuer.username)),
      {
        title: "IDs issued",
        columns: [{ header: "Date" }, { header: "ID No." }, { header: "Resident" }, { header: "Purok" }],
        rows: rows.slice(0, ROW_LIMIT).map((r) => [fmtDate(r.issued_date), r.id_number, personName(r.resident), r.resident.purok?.name ?? "—"]),
        note: limitNote(Math.min(ROW_LIMIT, rows.length), rows.length),
      },
    ],
  };
}

async function finance(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const range = periodRange(p);
  const [revenues, disbursements, appropriations, funds] = await Promise.all([
    db.revenue.findMany({ where: { date: range }, include: { fund_source: { select: { name: true } } }, orderBy: { date: "desc" } }),
    db.disbursement.findMany({ where: { date: range }, include: { fund_source: { select: { name: true } }, appropriation: { select: { category: true } } }, orderBy: { date: "desc" } }),
    db.appropriation.findMany({ orderBy: [{ category: "asc" }, { item_name: "asc" }] }),
    db.fundSource.findMany({ orderBy: { name: "asc" } }),
  ]);
  const inTotal = revenues.reduce((s, r) => s + Number(r.amount), 0);
  const outTotal = disbursements.reduce((s, d) => s + Number(d.amount), 0);
  const appropriated = appropriations.reduce((s, a) => s + Number(a.appropriated_amount), 0);
  const disbursedApp = appropriations.reduce((s, a) => s + Number(a.disbursed_amount), 0);
  const monthly = (rows: { date: Date; amount: unknown }[]) =>
    byMonth(rows, (r) => r.date, p).map((m, i) => ({
      ...m,
      value: rows
        .filter((r) => {
          const iso = r.date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
          return p.month ? Number(iso.slice(8, 10)) === i + 1 : Number(iso.slice(5, 7)) === i + 1;
        })
        .reduce((s, r) => s + Number(r.amount), 0),
    }));
  const CATEGORY: Record<string, string> = { PS: "Personal Services", MOOE: "MOOE", CO: "Capital Outlay" };

  return {
    title: "Barangay Finance Report",
    description: "Revenues, disbursements, appropriations and fund balances",
    periodLabel: `${periodLabel(p)} · appropriations and balances as of ${fmtDate(new Date())}`,
    stats: [
      { label: "Revenues", value: peso(inTotal) },
      { label: "Disbursements", value: peso(outTotal) },
      { label: "Net", value: peso(inTotal - outTotal) },
      { label: "Appropriations used", value: pct(disbursedApp, appropriated), hint: `${peso(disbursedApp)} of ${peso(appropriated)}` },
    ],
    charts: [
      { title: "Revenues by month", kind: "bar", data: monthly(revenues) },
      { title: "Disbursements by month", kind: "bar", data: monthly(disbursements) },
      { title: "Revenue sources", kind: "pie", data: sumBy(revenues, (r) => r.category?.trim() || r.source, (r) => Number(r.amount)).slice(0, 8) },
    ],
    tables: [
      {
        title: "Fund sources",
        columns: [{ header: "Fund" }, { header: "Status" }, { header: "Original", align: "right" }, { header: "Current balance", align: "right" }],
        rows: funds.map((f) => [f.name, label(f.status), f.original_balance == null ? "—" : peso(Number(f.original_balance)), peso(Number(f.current_balance))]),
      },
      {
        title: "Appropriations",
        columns: [{ header: "Item" }, { header: "Category" }, { header: "Appropriated", align: "right" }, { header: "Obligated", align: "right" }, { header: "Disbursed", align: "right" }, { header: "Used", align: "right" }],
        rows: appropriations.map((a) => [a.item_name, CATEGORY[a.category] ?? a.category, peso(Number(a.appropriated_amount)), peso(Number(a.obligated_amount)), peso(Number(a.disbursed_amount)), pct(Number(a.disbursed_amount), Number(a.appropriated_amount))]),
      },
      {
        title: "Revenues by source",
        columns: [{ header: "Source" }, { header: "Amount", align: "right" }, { header: "Share", align: "right" }],
        rows: sumBy(revenues, (r) => r.source, (r) => Number(r.amount)).map((s) => [s.name, peso(s.value), pct(s.value, inTotal)]),
      },
      {
        title: "Disbursements by category",
        columns: [{ header: "Category" }, { header: "Amount", align: "right" }, { header: "Share", align: "right" }],
        rows: sumBy(disbursements, (d) => (d.appropriation ? CATEGORY[d.appropriation.category] : "No appropriation"), (d) => Number(d.amount)).map((s) => [s.name, peso(s.value), pct(s.value, outTotal)]),
      },
      {
        title: "Disbursements",
        columns: [{ header: "Date" }, { header: "Payee" }, { header: "Particular" }, { header: "Check / OR" }, { header: "Amount", align: "right" }],
        rows: disbursements.slice(0, ROW_LIMIT).map((d) => [fmtDate(d.date), d.payee, d.particular ?? d.item ?? "—", d.check_number ?? d.or_number ?? "—", peso(Number(d.amount))]),
        note: limitNote(Math.min(ROW_LIMIT, disbursements.length), disbursements.length),
      },
    ],
  };
}

const CERT_LABEL: Record<string, string> = {
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

/** "Summary of all requests": everything people asked the barangay for in the period. */
async function requests(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const range = periodRange(p);
  const [certs, ids, blotter, borrowings] = await Promise.all([
    db.certificate.findMany({
      where: { requested_at: range },
      select: { certificate_type: true, status: true, payment_status: true, requested_at: true, issued_at: true },
    }),
    db.barangayId.count({ where: { issued_date: range } }),
    db.blotterCase.findMany({ where: { created_at: range }, select: { status: true } }),
    db.equipmentBorrowing.findMany({ where: { date_borrowed: range }, select: { actual_return: true, expected_return: true } }),
  ]);
  const now = new Date();
  const released = certs.filter((c) => c.status === "RELEASED" && c.issued_at);
  const avgHours = released.length
    ? released.reduce((s, c) => s + (c.issued_at!.getTime() - c.requested_at.getTime()), 0) / released.length / 3600000
    : null;
  const statusCols = ["PENDING", "PROCESSING", "RELEASED", "CANCELLED"];
  const types = Object.keys(CERT_LABEL);

  return {
    title: "Summary of Requests",
    description: "Every document, ID, case and borrowing requested",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Document requests", value: count(certs.length) },
      { label: "Released", value: count(released.length), hint: pct(released.length, certs.length) + " of requests" },
      { label: "Still pending", value: count(certs.filter((c) => c.status === "PENDING" || c.status === "PROCESSING").length) },
      { label: "Avg. time to release", value: avgHours === null ? "—" : avgHours < 24 ? `${avgHours.toFixed(1)} hr` : `${(avgHours / 24).toFixed(1)} days` },
      { label: "Barangay IDs issued", value: count(ids) },
      { label: "Blotter cases filed", value: count(blotter.length) },
      { label: "Equipment borrowings", value: count(borrowings.length) },
    ],
    charts: [
      { title: p.month ? "Document requests per day" : "Document requests per month", kind: "bar", data: byMonth(certs, (c) => c.requested_at, p) },
      { title: "Requests by document", kind: "pie", data: tally(certs, (c) => CERT_LABEL[c.certificate_type] ?? c.certificate_type) },
    ],
    tables: [
      {
        title: "Document requests by type and status",
        columns: [
          { header: "Document" },
          ...statusCols.map((s) => ({ header: label(s), align: "right" as const })),
          { header: "Total", align: "right" },
        ],
        rows: [
          ...types
            .map((t) => {
              const ofType = certs.filter((c) => c.certificate_type === t);
              return [CERT_LABEL[t], ...statusCols.map((s) => count(ofType.filter((c) => c.status === s).length)), count(ofType.length)];
            })
            .filter((r) => r[r.length - 1] !== "0"),
          ["Total", ...statusCols.map((s) => count(certs.filter((c) => c.status === s).length)), count(certs.length)],
        ],
      },
      tableOf("Payment", ["Payment status"], tally(certs, (c) => label(c.payment_status))),
      tableOf("Blotter cases by status", ["Status"], tally(blotter, (b) => label(b.status))),
      {
        title: "Equipment borrowings",
        columns: [{ header: "Status" }, { header: "Count", align: "right" }],
        rows: [
          ["Returned", count(borrowings.filter((b) => b.actual_return).length)],
          ["Out, on time", count(borrowings.filter((b) => !b.actual_return && b.expected_return >= now).length)],
          ["Out, overdue", count(borrowings.filter((b) => !b.actual_return && b.expected_return < now).length)],
        ],
      },
    ],
  };
}

/** Processing Time: how long each kind of request takes, step by step (Nov 2026). */
async function processing(db: Db, p: ReportPeriod): Promise<Omit<ReportData, "type">> {
  const rows = await loadTimingRows(db, periodRange(p));
  const groups = summarize(rows);
  const d = formatDuration;
  const certs = groups.find((g) => g.kind === "all-certificates") ?? groups.find((g) => g.kind === "certificate");
  const of = (kind: string) => groups.find((g) => g.kind === kind);
  const timed = rows.filter((r) => r.encoding !== null).length;
  const mins = (ms: number | null) => (ms === null ? 0 : Math.round((ms / 60000) * 10) / 10);
  const latest = [...rows].sort((a, b) => b.filed.getTime() - a.filed.getTime()).slice(0, ROW_LIMIT);

  return {
    title: "Processing Time",
    description: "How long requests take in the system, step by step",
    periodLabel: periodLabel(p),
    stats: [
      { label: "Certificate encoding", value: d(certs?.encoding.average), hint: certs ? `median ${d(certs.encoding.median)}` : undefined },
      { label: "Certificate filed to released", value: d(certs?.filedToDone.average), hint: certs ? `median ${d(certs.filedToDone.median)}` : undefined },
      { label: "Certificate total", value: d(certs?.total.average), hint: "form opened to released" },
      { label: "Barangay ID encoding", value: d(of("barangay-id")?.encoding.average) },
      { label: "Blotter filing", value: d(of("blotter")?.encoding.average) },
      { label: "Borrowing encoding", value: d(of("borrowing")?.encoding.average) },
      { label: "Requests timed", value: `${count(timed)} of ${count(rows.length)}`, hint: "have an encoding time" },
    ],
    charts: [
      {
        title: "Average encoding time (minutes)",
        kind: "bar",
        data: groups.filter((g) => g.kind !== "all-certificates").map((g) => ({ name: g.label, value: mins(g.encoding.average) })),
      },
      {
        title: "Average total time (minutes)",
        kind: "bar",
        data: groups.filter((g) => g.kind !== "all-certificates").map((g) => ({ name: g.label, value: mins(g.total.average) })),
      },
    ],
    tables: [
      {
        title: "Average time per step",
        columns: [
          { header: "Document" },
          { header: "Requests", align: "right" },
          { header: "Encoding", align: "right" },
          { header: "Waiting", align: "right" },
          { header: "Processing", align: "right" },
          { header: "Filed to released", align: "right" },
          { header: "Total", align: "right" },
        ],
        rows: groups.map((g) => [
          g.kind === "all-certificates" ? "Total" : g.label,
          count(g.requests),
          d(g.encoding.average),
          d(g.waiting.average),
          d(g.processing.average),
          d(g.filedToDone.average),
          d(g.total.average),
        ]),
        note: TIMING_NOTE,
      },
      {
        title: "Total time: spread",
        columns: [
          { header: "Document" },
          { header: "Timed", align: "right" },
          { header: "Average", align: "right" },
          { header: "Median", align: "right" },
          { header: "Fastest", align: "right" },
          { header: "Slowest", align: "right" },
        ],
        rows: groups.map((g) => [
          g.kind === "all-certificates" ? "Total" : g.label,
          count(g.total.count),
          d(g.total.average),
          d(g.total.median),
          d(g.total.fastest),
          d(g.total.slowest),
        ]),
      },
      {
        title: "Each request",
        columns: [
          { header: "Reference" },
          { header: "Document" },
          { header: "Filed" },
          { header: "Encoding", align: "right" },
          { header: "Waiting", align: "right" },
          { header: "Processing", align: "right" },
          { header: "Total", align: "right" },
        ],
        rows: latest.map((r) => [
          r.reference,
          r.document,
          `${fmtDate(r.filed)} ${fmtTime(r.filed)}`,
          d(r.encoding),
          d(r.waiting),
          d(r.processing),
          d(r.total),
        ]),
        note: limitNote(latest.length, rows.length) ? `${limitNote(latest.length, rows.length)} Export to Excel for all of them.` : undefined,
      },
    ],
  };
}

// ─── registry ─────────────────────────────────────────────────────────────

export const REPORT_DEFINITIONS = {
  requests: { title: "Summary of Requests", build: requests, usesPeriod: true },
  households: { title: "Households Report", build: (db: Db) => households(db), usesPeriod: false },
  health: { title: "Health Report", build: health, usesPeriod: true },
  deceased: { title: "Deaths Report", build: deceased, usesPeriod: true },
  officials: { title: "Officials Report", build: (db: Db) => officials(db), usesPeriod: false },
  visitors: { title: "Visitor Log Report", build: visitors, usesPeriod: true },
  meetings: { title: "Meetings Report", build: meetings, usesPeriod: true },
  "barangay-ids": { title: "Barangay ID Report", build: barangayIds, usesPeriod: true },
  finance: { title: "Barangay Finance Report", build: finance, usesPeriod: true },
  processing: { title: "Processing Time", build: processing, usesPeriod: true },
} as const;

export type DefinedReportType = keyof typeof REPORT_DEFINITIONS;

export function isDefinedReport(type: string): type is DefinedReportType {
  return Object.prototype.hasOwnProperty.call(REPORT_DEFINITIONS, type);
}

export async function buildReport(db: Db, type: DefinedReportType, period: ReportPeriod): Promise<ReportData> {
  const def = REPORT_DEFINITIONS[type];
  const data = await def.build(db, period);
  return { type, ...data };
}

/** Year/month from ?year=&month=, defaulting to the current year. */
export function readPeriod(searchParams: URLSearchParams): ReportPeriod {
  const thisYear = Number(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }).slice(0, 4));
  const y = Number(searchParams.get("year"));
  const m = Number(searchParams.get("month"));
  return {
    year: Number.isInteger(y) && y >= 2000 && y <= thisYear + 1 ? y : thisYear,
    month: Number.isInteger(m) && m >= 1 && m <= 12 ? m : null,
  };
}