// FILE: src/lib/mock/officials.ts
// Shared types + display helpers for the Officials module. Shapes mirror
// the `BrgyOfficial` model in prisma/schema.prisma and the JSON returned by:
//   GET    /api/officials          → BrgyOfficial[] & { resident }
//   GET    /api/officials/[id]     → BrgyOfficial & { resident }
//   POST   /api/officials          → BrgyOfficial & { resident }
//   PATCH  /api/officials/[id]     → BrgyOfficial & { resident }
//   DELETE /api/officials/[id]     → { message }

export const POSITIONS = [
  "Punong Barangay",
  "Barangay Kagawad",
  "SK Chairperson",
  "Barangay Secretary",
  "Barangay Treasurer",
  "Lupon Tagapamayapa Chairperson",
  "BHW Coordinator",
  "Barangay Tanod Chief",
];

export const PUROK_ASSIGNMENTS = ["Purok I", "Purok II", "Purok III", "Purok IV", "Purok V", "At-Large"];

export interface OfficialResidentMock {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string; // ISO date
  sex: string;
  civil_status: string;
  place_of_birth: string | null;
  purok: { id: number; name: string } | null;
  household: { id: number; address: string } | null;
}

export interface BrgyOfficialMock {
  id: number;
  resident_id: number;
  resident: OfficialResidentMock;
  position: string;
  contact_no: string | null;
  photo_url: string | null;
  purok_assignment: string | null;
  term_start: string; // ISO date
  term_end: string | null; // ISO date
  is_active: boolean;
}

// ── HELPERS ────────────────────────────────────────────────────────────────

export function residentFullName(r: OfficialResidentMock) {
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

export function formatISODate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function termLabel(official: BrgyOfficialMock) {
  const start = new Date(official.term_start).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const end = official.term_end
    ? new Date(official.term_end).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Present";
  return `${start} – ${end}`;
}