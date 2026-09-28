// FILE: src/lib/barangay-info.ts
//
// Single source of truth for "which barangay is this, and who is the
// captain right now" — used by every certificate / Barangay ID PDF and by
// GET /api/barangay-info for the client-side previews. Replaces the
// hardcoded MOCK_BARANGAY_INFO / MOCK_ACTIVE_CAPTAIN constants that used
// to print one specific barangay and captain on every document regardless
// of what was configured.
//
// Barangay details come from General Settings (SystemSetting rows:
// barangay_name, city, province, region). The captain comes from the
// Officials table (active "Punong Barangay"), unless the admin has typed a
// signatory override in General Settings (captain_override_name /
// captain_override_position), which wins — that's what the override
// fields exist for.
import { prisma } from "@/lib/db";

export interface BarangayInfo {
  name: string;
  city: string;
  province: string;
  region: string;
}

export interface ActiveCaptain {
  name: string;
  position: string;
  term: string;
}

const SETTING_KEYS = [
  "barangay_name",
  "city",
  "province",
  "region",
  "captain_override_name",
  "captain_override_position",
] as const;

async function loadSettings(): Promise<Record<string, string>> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  return Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value.trim()]));
}

// "Juan D. Dela Cruz Jr." — natural order, as it appears on a signature line.
function signatoryName(r: { fname: string; mname: string | null; lname: string; name_extension: string | null }) {
  return [r.fname, r.mname ? `${r.mname[0]}.` : "", r.lname, r.name_extension ?? ""].filter(Boolean).join(" ");
}

function termLabel(start: Date, end: Date | null) {
  return `${start.getFullYear()}–${end ? end.getFullYear() : "present"}`;
}

export async function getBarangayInfo(): Promise<BarangayInfo> {
  const s = await loadSettings();
  return {
    name: s.barangay_name ?? "",
    city: s.city ?? "",
    province: s.province ?? "",
    region: s.region ?? "",
  };
}

export async function getActiveCaptain(): Promise<ActiveCaptain> {
  const s = await loadSettings();

  if (s.captain_override_name) {
    return {
      name: s.captain_override_name,
      position: s.captain_override_position || "Punong Barangay",
      term: "",
    };
  }

  const official = await prisma.brgyOfficial.findFirst({
    where: { is_active: true, position: { in: ["Punong Barangay", "Barangay Captain"] } },
    orderBy: { term_start: "desc" },
    include: { resident: { select: { fname: true, mname: true, lname: true, name_extension: true } } },
  });

  if (!official) return { name: "", position: "Punong Barangay", term: "" };

  return {
    name: signatoryName(official.resident),
    position: official.position,
    term: termLabel(official.term_start, official.term_end),
  };
}

// Both at once — one settings query's worth of latency per document.
export async function getBarangayContext(): Promise<{ barangay: BarangayInfo; captain: ActiveCaptain }> {
  const [barangay, captain] = await Promise.all([getBarangayInfo(), getActiveCaptain()]);
  return { barangay, captain };
}