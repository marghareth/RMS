// FILE: src/lib/mock/barangayId.ts
// Shared types + display helpers for the Barangay ID module. Shapes mirror
// the `BarangayId` model in prisma/schema.prisma and the JSON returned by:
//   GET  /api/barangay-id   → { ids, total, page, limit }
//   POST /api/barangay-id   → BarangayId & { resident, issuer }
// Note: there is no /api/barangay-id/[id] route (no GET/PATCH/DELETE by id) —
// issued IDs are append-only from the UI's perspective, matching the current API.

export interface IdResidentMock {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string; // ISO date
  sex: string;
  civil_status: string;
  purok: { id: number; name: string } | null;
  household: { id: number; address: string } | null;
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