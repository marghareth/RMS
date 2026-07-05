// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Barangay ID UI is being built. Shapes mirror the `BarangayId` model in
// prisma/schema.prisma and the JSON returned by:
//   GET  /api/barangay-id   → { ids, total, page, limit }
//   POST /api/barangay-id   → BarangayId & { resident, issuer }
// Note: there is no /api/barangay-id/[id] route (no GET/PATCH/DELETE by id) —
// issued IDs are append-only from the UI's perspective, matching the current API.
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

export interface IdResidentMock {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string; // ISO date
  sex: string;
  civil_status: string;
  address: string;
  purok_name: string;
  photo_url: string | null;
}

export interface IdIssuerMock {
  id: number;
  username: string;
}

export interface BarangayIdMock {
  id: number;
  resident_id: number;
  resident: IdResidentMock;
  id_number: string;
  issued_date: string; // ISO datetime
  issued_by: number;
  issuer: IdIssuerMock;
}

const SECRETARY: IdIssuerMock = { id: 3, username: "secretary_dlrosario" };
const CAPTAIN: IdIssuerMock = { id: 1, username: "captain_garcia" };

export const MOCK_RESIDENTS_POOL: IdResidentMock[] = [
  {
    id: 12,
    fname: "Maria",
    lname: "Santos",
    mname: "Reyes",
    name_extension: null,
    birthdate: "1985-03-14",
    sex: "FEMALE",
    civil_status: "MARRIED",
    address: "Purok II, Brgy. Quisol",
    purok_name: "Purok II",
    photo_url: null,
  },
  {
    id: 8,
    fname: "Jose Enrique",
    lname: "Castro",
    mname: "Barriga",
    name_extension: "Sr.",
    birthdate: "1990-08-01",
    sex: "MALE",
    civil_status: "MARRIED",
    address: "Purok IV, Brgy. Quisol",
    purok_name: "Purok IV",
    photo_url: null,
  },
  {
    id: 45,
    fname: "Ricardo",
    lname: "Dela Peña",
    mname: "Suarez",
    name_extension: null,
    birthdate: "1995-10-03",
    sex: "MALE",
    civil_status: "SINGLE",
    address: "Purok I, Brgy. Quisol",
    purok_name: "Purok I",
    photo_url: null,
  },
  {
    id: 21,
    fname: "Anna Marie",
    lname: "Dungalo",
    mname: "Pelaez",
    name_extension: null,
    birthdate: "1988-05-14",
    sex: "FEMALE",
    civil_status: "WIDOWED",
    address: "Purok I, Brgy. Quisol",
    purok_name: "Purok I",
    photo_url: null,
  },
];

export const MOCK_BARANGAY_IDS: BarangayIdMock[] = [
  {
    id: 1,
    resident_id: 12,
    resident: MOCK_RESIDENTS_POOL[0],
    id_number: "BID-2026-483920",
    issued_date: "2026-06-28T09:20:00Z",
    issued_by: 3,
    issuer: SECRETARY,
  },
  {
    id: 2,
    resident_id: 8,
    resident: MOCK_RESIDENTS_POOL[1],
    id_number: "BID-2026-217754",
    issued_date: "2026-06-22T13:05:00Z",
    issued_by: 3,
    issuer: SECRETARY,
  },
  {
    id: 3,
    resident_id: 45,
    resident: MOCK_RESIDENTS_POOL[2],
    id_number: "BID-2026-108847",
    issued_date: "2026-05-30T10:40:00Z",
    issued_by: 1,
    issuer: CAPTAIN,
  },
  {
    id: 4,
    resident_id: 21,
    resident: MOCK_RESIDENTS_POOL[3],
    id_number: "BID-2025-994231",
    issued_date: "2025-11-14T08:15:00Z",
    issued_by: 3,
    issuer: SECRETARY,
  },
];

// Residents who don't yet have a barangay ID issued — stands in for what a
// real "eligible residents" filter (e.g. residents without a BarangayId
// record) would return for the picker on the New Barangay ID form.
export const MOCK_RESIDENTS_WITHOUT_ID: IdResidentMock[] = [
  {
    id: 201,
    fname: "Marlon",
    lname: "Villareal",
    mname: "Tan",
    name_extension: null,
    birthdate: "1985-11-08",
    sex: "MALE",
    civil_status: "MARRIED",
    address: "Purok III, Brgy. Quisol",
    purok_name: "Purok III",
    photo_url: null,
  },
  {
    id: 202,
    fname: "Grace",
    lname: "Ochoa",
    mname: "Lim",
    name_extension: null,
    birthdate: "1999-01-19",
    sex: "FEMALE",
    civil_status: "SINGLE",
    address: "Purok V, Brgy. Quisol",
    purok_name: "Purok V",
    photo_url: null,
  },
];

// ── HELPERS ────────────────────────────────────────────────────────────────

export function residentFullName(r: IdResidentMock) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

export function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function formatISODate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

// IDs are valid for 3 years from issuance in this mock — mirrors a common
// barangay ID validity period. The real schema has no expiry field, so this
// is a UI-only convenience derived from issued_date.
export function expiryDate(issuedDate: string) {
  const d = new Date(issuedDate);
  d.setFullYear(d.getFullYear() + 3);
  return d.toISOString();
}

export function isExpired(issuedDate: string) {
  return new Date(expiryDate(issuedDate)).getTime() < Date.now();
}