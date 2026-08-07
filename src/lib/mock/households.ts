// FILE: src/lib/mock/households.ts
//
// Shapes mirror the `Household` / `Purok` / `Resident` / `Migrant` models in
// prisma/schema.prisma and the JSON returned by:
//   GET   /api/households          → { households, total, page, limit }
//   GET   /api/households/[id]     → Household & { purok, household_head, members, migrants }
//   POST  /api/households          → Household
//   PATCH /api/households/[id]     → Household
//   DELETE /api/households/[id]    → { message }
//   GET   /api/puroks              → Purok[]
//   POST  /api/migrants            → Migrant
//   PATCH /api/migrants/[id]       → Migrant
//   DELETE /api/migrants/[id]      → { message }
//   PATCH /api/residents/[id]      → used to add/remove a member by setting
//                                     household_id (this is how membership
//                                     is actually managed — there is no
//                                     dedicated household-members endpoint)

export interface PurokMock {
  id: number;
  name: string;
}

export interface HouseholdMemberMock {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string; // ISO date
  sex: string;
  civil_status: string;
  occupation: string | null;
}

// ── Migrants (2.8) ────────────────────────────────────────────────────────
export interface MigrantMock {
  id: number;
  household_id: number;
  name: string;
  previous_location: string | null;
  reason: string | null;
  transferred_to: string | null;
  duration_here: string | null;
  has_returned: boolean;
  created_at: string; // ISO date
  updated_at: string; // ISO date
}

export interface HouseholdMock {
  id: number;
  household_no: string;
  purok_id: number;
  purok: PurokMock;
  household_head_id: number | null;
  household_head: HouseholdMemberMock | null;
  address: string;
  housing_type: string | null; // OWN, RENT, SHARED, INFORMAL
  water_source: string | null; // INDIVIDUAL, COMMUNAL, WELL, OTHER
  comfort_room: string | null; // OWN, SHARED, NONE
  created_at: string; // ISO date
  updated_at: string; // ISO date
  members: HouseholdMemberMock[];

  // ── DILG/BIMS enhancements (2.8) ──
  tenure_status: string | null;        // OWNER, RENTER, CARETAKER, SHARER, OTHER
  tenure_other: string | null;
  housing_type_other: string | null;
  household_unit: string | null;       // SINGLE_HOUSE, DUPLEX, APARTMENT, OTHER
  household_unit_other: string | null;
  no_of_families: number | null;
  monthly_income: number | null;
  waste_disposal: string | null;       // COLLECTED, BURNED, BURIED, COMPOSTED, OTHER
  power_supply: string | null;         // ELECTRIC_METERED, ELECTRIC_SHARED, SOLAR, NONE, OTHER
  migrants: MigrantMock[];
}

export function formatISODate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function memberFullName(m: HouseholdMemberMock) {
  const ext = m.name_extension ? ` ${m.name_extension}` : "";
  const mi = m.mname ? ` ${m.mname[0]}.` : "";
  return `${m.lname}, ${m.fname}${ext}${mi}`;
}

export function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(
    amount ?? 0
  );
}

// ── BIMS CSV export (2.8) ───────────────────────────────────────────────────
// Column layout is a best-effort mapping of the fields DILG's Barangay
// Information Management System commonly asks for. Verify the exact BIMS
// CSV column spec/template with the barangay before finalizing field order
// for a real submission — this is a reasonable starting layout, not a
// guaranteed match to the official template.
const BIMS_HEADERS = [
  "Household No.",
  "Purok",
  "Address",
  "Household Head",
  "No. of Members",
  "No. of Families",
  "Housing Type",
  "Tenure Status",
  "Household Unit",
  "Water Source",
  "Waste Disposal",
  "Power Supply",
  "Toilet Type",
  "Monthly Income",
  "Date Registered",
];

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildBimsCsv(households: HouseholdMock[]): string {
  const rows = households.map((h) => [
    h.household_no,
    h.purok?.name ?? "",
    h.address,
    h.household_head ? memberFullName(h.household_head) : "",
    h.members.length,
    h.no_of_families ?? "",
    h.housing_type === "OTHER" ? h.housing_type_other ?? "Other" : h.housing_type ?? "",
    h.tenure_status === "OTHER" ? h.tenure_other ?? "Other" : h.tenure_status ?? "",
    h.household_unit === "OTHER" ? h.household_unit_other ?? "Other" : h.household_unit ?? "",
    h.water_source ?? "",
    h.waste_disposal ?? "",
    h.power_supply ?? "",
    h.comfort_room ?? "",
    h.monthly_income ?? "",
    formatISODate(h.created_at) ?? "",
  ]);

  return [BIMS_HEADERS, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}