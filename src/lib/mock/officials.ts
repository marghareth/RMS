// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Officials UI is being built. Shapes mirror the `BrgyOfficial` model in
// prisma/schema.prisma and the JSON returned by:
//   GET    /api/officials          → BrgyOfficial[] & { resident }
//   GET    /api/officials/[id]     → BrgyOfficial & { resident }
//   POST   /api/officials          → BrgyOfficial
//   PATCH  /api/officials/[id]     → BrgyOfficial
//   DELETE /api/officials/[id]     → { message }
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

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
  address: string;
  place_of_birth: string;
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

export const MOCK_OFFICIALS: BrgyOfficialMock[] = [
  {
    id: 1,
    resident_id: 120,
    resident: {
      id: 120,
      fname: "Pedro",
      lname: "Garcia",
      mname: "Barriga",
      name_extension: null,
      birthdate: "1983-08-29",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Street Poblacion, Purok III",
      place_of_birth: "Poblacion, Danao City, Cebu, PH 6004",
    },
    position: "Punong Barangay",
    contact_no: "0917-000-1122",
    photo_url: null,
    purok_assignment: "At-Large",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 2,
    resident_id: 45,
    resident: {
      id: 45,
      fname: "Ricardo",
      lname: "Dela Peña",
      mname: "Suarez",
      name_extension: null,
      birthdate: "1978-04-12",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Purok I, Brgy. Quisol",
      place_of_birth: "Danao City, Cebu",
    },
    position: "Barangay Kagawad",
    contact_no: "0918-223-4455",
    photo_url: null,
    purok_assignment: "Purok I",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 3,
    resident_id: 21,
    resident: {
      id: 21,
      fname: "Anna Marie",
      lname: "Dungalo",
      mname: "Pelaez",
      name_extension: null,
      birthdate: "1988-05-14",
      sex: "FEMALE",
      civil_status: "WIDOWED",
      address: "Purok II, Brgy. Quisol",
      place_of_birth: "Danao City, Cebu",
    },
    position: "Barangay Kagawad",
    contact_no: "0917-555-0199",
    photo_url: null,
    purok_assignment: "Purok II",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 4,
    resident_id: 8,
    resident: {
      id: 8,
      fname: "Jose Enrique",
      lname: "Castro",
      mname: "Barriga",
      name_extension: "Sr.",
      birthdate: "1990-08-01",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Purok IV, Brgy. Quisol",
      place_of_birth: "Sabang, Danao City, Cebu, PH 6004",
    },
    position: "Barangay Secretary",
    contact_no: "0928-111-2233",
    photo_url: null,
    purok_assignment: "At-Large",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 5,
    resident_id: 130,
    resident: {
      id: 130,
      fname: "Fernando",
      lname: "Bautista",
      mname: "Marquez",
      name_extension: null,
      birthdate: "1975-02-11",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Purok II, Riverside Road",
      place_of_birth: "Danao City, Cebu",
    },
    position: "Barangay Treasurer",
    contact_no: "0927-303-9911",
    photo_url: null,
    purok_assignment: "At-Large",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 6,
    resident_id: 33,
    resident: {
      id: 33,
      fname: "Charlene",
      lname: "Asuncion",
      mname: "Santos",
      name_extension: null,
      birthdate: "1997-03-30",
      sex: "FEMALE",
      civil_status: "SINGLE",
      address: "Street Buwang, Purok II",
      place_of_birth: "Danao City, Cebu",
    },
    position: "SK Chairperson",
    contact_no: "0918-777-4432",
    photo_url: null,
    purok_assignment: "At-Large",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 7,
    resident_id: 52,
    resident: {
      id: 52,
      fname: "Grace",
      lname: "Ochoa",
      mname: "Lim",
      name_extension: null,
      birthdate: "1999-01-19",
      sex: "FEMALE",
      civil_status: "SINGLE",
      address: "Purok V, Brgy. Quisol",
      place_of_birth: "Danao City, Cebu",
    },
    position: "BHW Coordinator",
    contact_no: "0919-888-6677",
    photo_url: null,
    purok_assignment: "Purok V",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 8,
    resident_id: 27,
    resident: {
      id: 27,
      fname: "Noel",
      lname: "Ibarra",
      mname: "Pantoja",
      name_extension: null,
      birthdate: "1982-06-27",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Purok III, Brgy. Quisol",
      place_of_birth: "Danao City, Cebu",
    },
    position: "Barangay Tanod Chief",
    contact_no: "0919-000-1122",
    photo_url: null,
    purok_assignment: "At-Large",
    term_start: "2023-11-01",
    term_end: "2026-10-31",
    is_active: true,
  },
  {
    id: 9,
    resident_id: 19,
    resident: {
      id: 19,
      fname: "Bienvenido",
      lname: "Cruz",
      mname: "Torres",
      name_extension: "Jr.",
      birthdate: "1970-09-05",
      sex: "MALE",
      civil_status: "MARRIED",
      address: "Purok IV, Brgy. Quisol",
      place_of_birth: "Danao City, Cebu",
    },
    position: "Barangay Kagawad",
    contact_no: "0917-444-9900",
    photo_url: null,
    purok_assignment: "Purok IV",
    term_start: "2020-11-01",
    term_end: "2023-10-31",
    is_active: false, // previous term, no longer active
  },
];

// Residents not currently holding any official position — stands in for
// what a real "eligible residents" filter would return for the picker on
// the New Official form (resident_id is @unique on BrgyOfficial).
export const MOCK_ELIGIBLE_RESIDENTS: OfficialResidentMock[] = [
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
    place_of_birth: "Danao City, Cebu",
  },
  {
    id: 202,
    fname: "Liza",
    lname: "Garcia",
    mname: "Reyes",
    name_extension: null,
    birthdate: "1985-04-10",
    sex: "FEMALE",
    civil_status: "MARRIED",
    address: "Street Poblacion, Purok III",
    place_of_birth: "Danao City, Cebu",
  },
  {
    id: 203,
    fname: "Kenneth",
    lname: "Aranas",
    mname: "Diaz",
    name_extension: null,
    birthdate: "2001-02-19",
    sex: "MALE",
    civil_status: "SINGLE",
    address: "Purok V, Brgy. Quisol",
    place_of_birth: "Danao City, Cebu",
  },
];

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