export interface Purok {
  id: number;
  name: string;
}

export interface Household {
  id: number;
  household_no: string;
  address: string;
  housing_type: string | null;
  water_source: string | null;
  comfort_room: string | null;
  members: Resident[];
}

export interface Certificate {
  id: number;
  certificate_type: string;
  purpose: string;
  issued_at: string;
}

export interface SpecialRegistry {
  id: number;
  registry_type: string;
  disability_type: string | null;
}

export interface HealthRecord {
  id: number;
  record_type: string;
  notes: string | null;
  recorded_at: string;
}

export interface Vaccination {
  id: number;
  vaccine_name: string;
  date_given: string;
}

export interface BarangayId {
  id: number;
  id_number: string;
  issued_date: string;
}

export interface Resident {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string;
  place_of_birth: string | null;
  sex: string;
  civil_status: string;
  citizenship: string;
  religion: string | null;
  nationality: string;
  employment_status: string | null;
  educational_attainment: string | null;
  occupation: string | null;
  income_bracket: string | null;
  sector: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  purok: Purok | null;
  household: Household | null;
  certificates: Certificate[];
  special_registries: SpecialRegistry[];
  health_records: HealthRecord[];
  vaccinations: Vaccination[];
  barangay_ids: BarangayId[];
  purok_id?: number | null;
  household_id?: number | null;
}

export const mockPuroks: Purok[] = [
  { id: 1, name: "Purok 1" },
  { id: 2, name: "Purok 2" },
  { id: 3, name: "Purok 3" },
  { id: 4, name: "Purok 4" },
];

const STORAGE_KEY = "rms-mock-residents";

function createInitialResidents(): Resident[] {
  const householdOne: Household = {
    id: 101,
    household_no: "HH-001",
    address: "Blk 12 Lot 3, Mabini Street",
    housing_type: "OWN",
    water_source: "DEEP_WELL",
    comfort_room: "FLUSH",
    members: [],
  };

  const householdTwo: Household = {
    id: 102,
    household_no: "HH-002",
    address: "Zone 4, San Vicente",
    housing_type: "RENT",
    water_source: "COMMUNITY",
    comfort_room: "CLOSED_PIT",
    members: [],
  };

  const residents: Resident[] = [
    {
      id: 1,
      fname: "Maria",
      lname: "Dela Cruz",
      mname: "Santos",
      name_extension: null,
      birthdate: "1990-04-12",
      place_of_birth: "Quezon City",
      sex: "FEMALE",
      civil_status: "MARRIED",
      citizenship: "Filipino",
      religion: "Roman Catholic",
      nationality: "Filipino",
      employment_status: "EMPLOYED",
      educational_attainment: "COLLEGE",
      occupation: "Teacher",
      income_bracket: "MID",
      sector: "EDUCATION",
      is_archived: false,
      created_at: "2024-01-15T09:30:00.000Z",
      updated_at: "2024-01-15T09:30:00.000Z",
      purok: mockPuroks[0],
      household: householdOne,
      certificates: [
        { id: 1, certificate_type: "RESIDENCY", purpose: "School enrollment", issued_at: "2024-02-01T00:00:00.000Z" },
      ],
      special_registries: [{ id: 1, registry_type: "SENIOR_CITIZEN", disability_type: null }],
      health_records: [{ id: 1, record_type: "CHECKUP", notes: "Annual physical", recorded_at: "2024-03-10T00:00:00.000Z" }],
      vaccinations: [{ id: 1, vaccine_name: "COVID-19", date_given: "2024-01-20T00:00:00.000Z" }],
      barangay_ids: [{ id: 1, id_number: "BM0000001", issued_date: "2024-02-01T00:00:00.000Z" }],
      purok_id: 1,
      household_id: 101,
    },
    {
      id: 2,
      fname: "Juan",
      lname: "Santos",
      mname: "Reyes",
      name_extension: null,
      birthdate: "1988-10-20",
      place_of_birth: "Manila",
      sex: "MALE",
      civil_status: "MARRIED",
      citizenship: "Filipino",
      religion: "Christian",
      nationality: "Filipino",
      employment_status: "SELF_EMPLOYED",
      educational_attainment: "VOCATIONAL",
      occupation: "Driver",
      income_bracket: "LOW",
      sector: "TRANSPORT",
      is_archived: false,
      created_at: "2024-02-10T10:00:00.000Z",
      updated_at: "2024-02-10T10:00:00.000Z",
      purok: mockPuroks[1],
      household: householdOne,
      certificates: [],
      special_registries: [{ id: 2, registry_type: "PWD", disability_type: "Mobility" }],
      health_records: [],
      vaccinations: [{ id: 2, vaccine_name: "Flu", date_given: "2024-03-01T00:00:00.000Z" }],
      barangay_ids: [{ id: 2, id_number: "BM0000002", issued_date: "2024-02-01T00:00:00.000Z" }],
      purok_id: 2,
      household_id: 101,
    },
    {
      id: 3,
      fname: "Ana",
      lname: "Lopez",
      mname: "Tan",
      name_extension: "Jr.",
      birthdate: "1995-07-03",
      place_of_birth: "Cavite",
      sex: "FEMALE",
      civil_status: "SINGLE",
      citizenship: "Filipino",
      religion: "Iglesia ni Cristo",
      nationality: "Filipino",
      employment_status: "STUDENT",
      educational_attainment: "COLLEGE",
      occupation: null,
      income_bracket: "LOW",
      sector: null,
      is_archived: false,
      created_at: "2024-03-01T11:00:00.000Z",
      updated_at: "2024-03-01T11:00:00.000Z",
      purok: mockPuroks[2],
      household: householdTwo,
      certificates: [{ id: 2, certificate_type: "INDIGENCY", purpose: "Medical assistance", issued_at: "2024-04-05T00:00:00.000Z" }],
      special_registries: [{ id: 3, registry_type: "FOUR_PS", disability_type: null }],
      health_records: [{ id: 2, record_type: "VITALS", notes: "Normal", recorded_at: "2024-04-05T00:00:00.000Z" }],
      vaccinations: [],
      barangay_ids: [{ id: 3, id_number: "BM0000003", issued_date: "2024-03-15T00:00:00.000Z" }],
      purok_id: 3,
      household_id: 102,
    },
  ];

  householdOne.members = residents.filter((resident) => resident.household_id === 101);
  householdTwo.members = residents.filter((resident) => resident.household_id === 102);

  return residents;
}

export const initialMockResidents = createInitialResidents();

function readResidentsFromStorage(): Resident[] {
  if (typeof window === "undefined") {
    return initialMockResidents;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      persistResidents(initialMockResidents);
      return initialMockResidents;
    }

    const parsed = JSON.parse(raw) as Resident[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialMockResidents;
  } catch {
    return initialMockResidents;
  }
}

// Rebuilds each resident's household.members array from household_id,
// since persistResidents intentionally strips it before writing to avoid
// the circular household<->members<->resident reference. Safe to rebuild
// on every read — this reconstructed graph is only ever read from until the
// next save, at which point persistResidents strips it again.
function attachHouseholdMembers(residents: Resident[]): Resident[] {
  const byHouseholdId = new Map<number, Resident[]>();
  for (const r of residents) {
    if (!r.household) continue;
    const list = byHouseholdId.get(r.household.id) ?? [];
    list.push(r);
    byHouseholdId.set(r.household.id, list);
  }
  return residents.map((r) =>
    r.household
      ? { ...r, household: { ...r.household, members: byHouseholdId.get(r.household.id) ?? [] } }
      : r
  );
}

export function getMockResidents(): Resident[] {
  return attachHouseholdMembers(readResidentsFromStorage());
}

export function getMockPuroks(): Purok[] {
  return mockPuroks;
}

export function persistResidents(residents: Resident[]) {
  if (typeof window === "undefined") {
    return;
  }

  // Each resident embeds its household, and each household embeds its member
  // residents — a genuine circular graph (resident.household.members[0] can
  // be the very resident being serialized). JSON.stringify can't handle
  // cycles, so we drop the redundant `members` array when writing (it's
  // reconstructed from household_id on every read instead — see
  // attachHouseholdMembers below).
  const safeReplacer = function (this: unknown, key: string, value: unknown) {
    if (key === "members" && this && typeof (this as { household_no?: unknown }).household_no === "string") {
      return undefined;
    }
    return value;
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(residents, safeReplacer));
}

export function saveMockResidents(residents: Resident[]) {
  persistResidents(residents);
  return residents;
}

export function updateMockResident(id: number, updates: Partial<Resident>) {
  const residents = getMockResidents();
  const nextResidents = residents.map((resident) =>
    resident.id === id
      ? {
          ...resident,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : resident,
  );

  persistResidents(nextResidents);
  return attachHouseholdMembers(nextResidents);
}

export function addMockResidents(nextResidents: Resident[]) {
  const residents = getMockResidents();
  const merged = [...residents, ...nextResidents];
  persistResidents(merged);
  return attachHouseholdMembers(merged);
}

export function resetMockResidents() {
  persistResidents(initialMockResidents);
  return attachHouseholdMembers(initialMockResidents);
}