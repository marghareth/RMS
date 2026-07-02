// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Temporary in-memory data standing in for the Prisma/DB layer while the
// Households UI is being built. Shapes mirror the `Household` / `Purok` /
// `Resident` models in prisma/schema.prisma and the JSON returned by:
//   GET   /api/households          → { households, total, page, limit }
//   GET   /api/households/[id]     → Household & { purok, household_head, members }
//   POST  /api/households          → Household
//   PATCH /api/households/[id]     → Household
//   DELETE /api/households/[id]    → { message }
//   GET   /api/puroks              → Purok[]
//   PATCH /api/residents/[id]      → used to add/remove a member by setting
//                                     household_id (this is how membership
//                                     is actually managed — there is no
//                                     dedicated household-members endpoint)
// Swap the mock reads/writes in each page for the commented-out fetch calls
// once the database is connected.

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
}

export const MOCK_PUROKS: PurokMock[] = [
  { id: 1, name: "Purok I" },
  { id: 2, name: "Purok II" },
  { id: 3, name: "Purok III" },
  { id: 4, name: "Purok IV" },
  { id: 5, name: "Purok V" },
];

export const MOCK_HOUSEHOLDS: HouseholdMock[] = [
  {
    id: 1,
    household_no: "HHNP100000001",
    purok_id: 2,
    purok: MOCK_PUROKS[1],
    household_head_id: 101,
    household_head: {
      id: 101,
      fname: "Jose Enrique",
      lname: "Castro",
      mname: "Barriga",
      name_extension: "Sr.",
      birthdate: "1990-08-01",
      sex: "MALE",
      civil_status: "MARRIED",
      occupation: "Teacher",
    },
    address: "Street Buwang, Purok II",
    housing_type: "OWN",
    water_source: "INDIVIDUAL",
    comfort_room: "OWN",
    created_at: "2025-01-14T08:30:00Z",
    updated_at: "2026-03-02T10:00:00Z",
    members: [
      {
        id: 101,
        fname: "Jose Enrique",
        lname: "Castro",
        mname: "Barriga",
        name_extension: "Sr.",
        birthdate: "1990-08-01",
        sex: "MALE",
        civil_status: "MARRIED",
        occupation: "Teacher",
      },
      {
        id: 102,
        fname: "Acharlene",
        lname: "Castro",
        mname: "Santos",
        name_extension: null,
        birthdate: "1992-03-30",
        sex: "FEMALE",
        civil_status: "MARRIED",
        occupation: "Nurse",
      },
      {
        id: 103,
        fname: "Juan Carlos",
        lname: "Castro",
        mname: "Barriga",
        name_extension: "Jr.",
        birthdate: "2015-12-09",
        sex: "MALE",
        civil_status: "SINGLE",
        occupation: null,
      },
    ],
  },
  {
    id: 2,
    household_no: "HHNP100000002",
    purok_id: 1,
    purok: MOCK_PUROKS[0],
    household_head_id: 110,
    household_head: {
      id: 110,
      fname: "Anna Marie",
      lname: "Dungalo",
      mname: "Pelaez",
      name_extension: null,
      birthdate: "1988-05-14",
      sex: "FEMALE",
      civil_status: "WIDOWED",
      occupation: "Vendor",
    },
    address: "Purok I, near covered court",
    housing_type: "RENT",
    water_source: "COMMUNAL",
    comfort_room: "SHARED",
    created_at: "2025-02-20T09:15:00Z",
    updated_at: "2025-11-10T14:20:00Z",
    members: [
      {
        id: 110,
        fname: "Anna Marie",
        lname: "Dungalo",
        mname: "Pelaez",
        name_extension: null,
        birthdate: "1988-05-14",
        sex: "FEMALE",
        civil_status: "WIDOWED",
        occupation: "Vendor",
      },
      {
        id: 111,
        fname: "Mark Anthony",
        lname: "Dungalo",
        mname: "Pelaez",
        name_extension: null,
        birthdate: "2010-07-22",
        sex: "MALE",
        civil_status: "SINGLE",
        occupation: null,
      },
    ],
  },
  {
    id: 3,
    household_no: "HHNP100000003",
    purok_id: 3,
    purok: MOCK_PUROKS[2],
    household_head_id: 120,
    household_head: {
      id: 120,
      fname: "Pedro",
      lname: "Garcia",
      mname: "Barriga",
      name_extension: null,
      birthdate: "1983-08-29",
      sex: "MALE",
      civil_status: "MARRIED",
      occupation: "Barangay Chairman",
    },
    address: "Street Poblacion, Purok III",
    housing_type: "OWN",
    water_source: "INDIVIDUAL",
    comfort_room: "OWN",
    created_at: "2024-11-05T07:00:00Z",
    updated_at: "2026-01-18T11:45:00Z",
    members: [
      {
        id: 120,
        fname: "Pedro",
        lname: "Garcia",
        mname: "Barriga",
        name_extension: null,
        birthdate: "1983-08-29",
        sex: "MALE",
        civil_status: "MARRIED",
        occupation: "Barangay Chairman",
      },
      {
        id: 121,
        fname: "Liza",
        lname: "Garcia",
        mname: "Reyes",
        name_extension: null,
        birthdate: "1985-04-10",
        sex: "FEMALE",
        civil_status: "MARRIED",
        occupation: "Housewife",
      },
      {
        id: 122,
        fname: "Miguel",
        lname: "Garcia",
        mname: "Reyes",
        name_extension: null,
        birthdate: "2008-09-18",
        sex: "MALE",
        civil_status: "SINGLE",
        occupation: "Student",
      },
      {
        id: 123,
        fname: "Sofia",
        lname: "Garcia",
        mname: "Reyes",
        name_extension: null,
        birthdate: "2012-01-25",
        sex: "FEMALE",
        civil_status: "SINGLE",
        occupation: "Student",
      },
    ],
  },
  {
    id: 4,
    household_no: "HHNP100000004",
    purok_id: 4,
    purok: MOCK_PUROKS[3],
    household_head_id: null,
    household_head: null,
    address: "Sitio Mahayahay, Purok IV",
    housing_type: "INFORMAL",
    water_source: "WELL",
    comfort_room: "NONE",
    created_at: "2026-04-02T13:00:00Z",
    updated_at: "2026-04-02T13:00:00Z",
    members: [],
  },
  {
    id: 5,
    household_no: "HHNP100000005",
    purok_id: 2,
    purok: MOCK_PUROKS[1],
    household_head_id: 130,
    household_head: {
      id: 130,
      fname: "Fernando",
      lname: "Bautista",
      mname: "Marquez",
      name_extension: null,
      birthdate: "1975-02-11",
      sex: "MALE",
      civil_status: "MARRIED",
      occupation: "Farmer",
    },
    address: "Purok II, Riverside Road",
    housing_type: "OWN",
    water_source: "INDIVIDUAL",
    comfort_room: "OWN",
    created_at: "2025-06-19T10:00:00Z",
    updated_at: "2025-06-19T10:00:00Z",
    members: [
      {
        id: 130,
        fname: "Fernando",
        lname: "Bautista",
        mname: "Marquez",
        name_extension: null,
        birthdate: "1975-02-11",
        sex: "MALE",
        civil_status: "MARRIED",
        occupation: "Farmer",
      },
    ],
  },
];

// Residents not currently attached to any household — stands in for what a
// real "unassigned residents" filter (e.g. GET /api/residents?household_id=null)
// would return, used by the member picker on the household detail page.
export const MOCK_UNASSIGNED_RESIDENTS: HouseholdMemberMock[] = [
  {
    id: 201,
    fname: "Ricardo",
    lname: "Dela Peña",
    mname: "Suarez",
    name_extension: null,
    birthdate: "1995-10-03",
    sex: "MALE",
    civil_status: "SINGLE",
    occupation: "Driver",
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
    occupation: "Sales Associate",
  },
  {
    id: 203,
    fname: "Noel",
    lname: "Ibarra",
    mname: "Pantoja",
    name_extension: null,
    birthdate: "1982-06-27",
    sex: "MALE",
    civil_status: "MARRIED",
    occupation: "Carpenter",
  },
];

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