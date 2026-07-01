import { getMockResidents, type Resident } from "@/lib/mockResidents";

export interface RegistryEntry {
  id: number;
  resident_id: number;
  registry_type: "FOUR_PS" | "PWD" | "SENIOR_CITIZEN";
  disability_type: string | null;
  is_4ps_beneficiary: boolean;
  registered_at: string;
  resident: Resident;
}

const STORAGE_KEY = "rms-mock-registries";

function buildMockRegistries(): RegistryEntry[] {
  const residents = getMockResidents();

  return [
    {
      id: 1,
      resident_id: residents[0].id,
      registry_type: "SENIOR_CITIZEN",
      disability_type: null,
      is_4ps_beneficiary: false,
      registered_at: "2024-02-01T00:00:00.000Z",
      resident: residents[0],
    },
    {
      id: 2,
      resident_id: residents[1].id,
      registry_type: "PWD",
      disability_type: "Mobility",
      is_4ps_beneficiary: false,
      registered_at: "2024-03-03T00:00:00.000Z",
      resident: residents[1],
    },
    {
      id: 3,
      resident_id: residents[2].id,
      registry_type: "FOUR_PS",
      disability_type: null,
      is_4ps_beneficiary: true,
      registered_at: "2024-04-04T00:00:00.000Z",
      resident: residents[2],
    },
  ];
}

function readRegistriesFromStorage(): RegistryEntry[] {
  if (typeof window === "undefined") {
    return buildMockRegistries();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      persistRegistries(buildMockRegistries());
      return buildMockRegistries();
    }

    const parsed = JSON.parse(raw) as RegistryEntry[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildMockRegistries();
  } catch {
    return buildMockRegistries();
  }
}

function persistRegistries(registries: RegistryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registries));
}

export function getMockRegistries(): RegistryEntry[] {
  return readRegistriesFromStorage();
}

export function getMockRegistryById(id: number) {
  return getMockRegistries().find((entry) => entry.id === id) ?? null;
}

export function addMockRegistry(nextRegistry: RegistryEntry) {
  const registries = getMockRegistries();
  const updated = [...registries, nextRegistry];
  persistRegistries(updated);
  return updated;
}

export function updateMockRegistry(id: number, updates: Partial<RegistryEntry>) {
  const registries = getMockRegistries();
  const updated = registries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry));
  persistRegistries(updated);
  return updated;
}

export function deleteMockRegistry(id: number) {
  const registries = getMockRegistries().filter((entry) => entry.id !== id);
  persistRegistries(registries);
  return registries;
}
