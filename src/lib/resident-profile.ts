// FILE: src/lib/resident-profile.ts
//
// What goes into a printed resident profile (Nov 2026). The person printing
// picks the sections in the "Print profile" dialog; each one also needs the
// matching permission, so e.g. a role that can't see blotter cases can't
// print them either. Used by GET /api/pdf/resident/[id].
//
// Server-only (Prisma).
import type { PrismaClient } from "@prisma/client";
import { hasPermission } from "@/lib/permission";
import type { ProfileSection } from "@/lib/pdf/ResidentProfilePDF";

import { PROFILE_SECTIONS, type ProfileSectionKey } from "@/lib/resident-profile-sections";

export { PROFILE_SECTIONS, type ProfileSectionKey };

/** The sections asked for (?sections=personal,health) that this role may see, in the standard order. */
export function allowedSections(requested: string | null, role: string): ProfileSectionKey[] {
  const asked = new Set((requested ?? "").split(",").map((x) => x.trim()).filter(Boolean));
  return PROFILE_SECTIONS.filter((sec) => asked.has(sec.key) && hasPermission(role, sec.permission)).map((sec) => sec.key);
}

export const rbiNo = (id: number) => `BM${String(id).padStart(7, "0")}`;

const CIVIL: Record<string, string> = { SINGLE: "Single", MARRIED: "Married", WIDOWED: "Widowed", SEPARATED: "Separated", LIVE_IN: "Live-in" };
const CERT: Record<string, string> = {
  RESIDENCY: "Certificate of Residency", INDIGENCY: "Certificate of Indigency", CLEARANCE: "Barangay Clearance",
  GOOD_MORAL: "Good Moral Character", BUSINESS_PERMIT: "Business Clearance", COHABITATION: "Cohabitation",
  SOLO_PARENT: "Solo Parent", FIRST_TIME_JOB_SEEKER: "First-Time Job Seeker", LATE_REGISTRATION: "Late Registration",
};

function title(code: string | null | undefined) {
  if (!code) return "";
  return code.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function date(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

function longDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" });
}

export function ageOn(birth: Date, on: Date): number {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

type NameParts = { fname: string; lname: string; mname: string | null; name_extension: string | null };
export function naturalName(r: NameParts) {
  return [r.fname, r.mname ? `${r.mname[0]}.` : "", r.lname, r.name_extension ?? ""].filter(Boolean).join(" ");
}

/** Only the last four digits of a PhilSys number are printed. */
export function maskPhilSys(v: string | null | undefined) {
  const digits = (v ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `•••• •••• ${digits.slice(-4)}` : "";
}

type Db = Pick<PrismaClient, "resident">;

export async function loadProfileResident(db: Db, id: number) {
  return db.resident.findUnique({
    where: { id },
    include: {
      purok: true,
      household: {
        include: {
          purok: true,
          household_head: { select: { id: true, fname: true, lname: true, mname: true, name_extension: true } },
          members: {
            select: { id: true, fname: true, lname: true, mname: true, name_extension: true, sex: true, birthdate: true, civil_status: true, is_deceased: true, is_archived: true },
            orderBy: { birthdate: "asc" },
          },
        },
      },
      sectors: true,
      special_registries: true,
      government_assistance: { orderBy: { date_enrolled: "desc" } },
      certificates: { orderBy: { requested_at: "desc" }, select: { queue_number: true, certificate_type: true, purpose: true, status: true, requested_at: true, issued_at: true } },
      health_records: { orderBy: { recorded_at: "desc" } },
      vaccinations: { orderBy: { date_given: "desc" } },
      blotter_as_complainant: { select: { case_number: true, incident_type: true, incident_date: true, status: true } },
      blotter_as_respondent: { select: { case_number: true, incident_type: true, incident_date: true, status: true } },
    },
  });
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadProfileResident>>>;

export function buildProfileSections(r: Loaded, keys: ProfileSectionKey[], now: Date = new Date()): ProfileSection[] {
  const out: ProfileSection[] = [];
  const address =
    [r.house_block_lot_no, r.street, r.subdivision_village].filter(Boolean).join(" ") || r.household?.address || "";

  for (const key of keys) {
    if (key === "personal") {
      out.push({
        title: "Personal information",
        fields: [
          { label: "Last name", value: r.lname },
          { label: "First name", value: r.fname },
          { label: "Middle name", value: r.mname ?? "" },
          { label: "Suffix", value: r.name_extension ?? "" },
          { label: "Date of birth", value: longDate(r.birthdate) },
          { label: "Age", value: String(ageOn(new Date(r.birthdate), now)) },
          { label: "Place of birth", value: r.place_of_birth ?? "" },
          { label: "Sex", value: title(r.sex) },
          { label: "Civil status", value: CIVIL[r.civil_status] ?? title(r.civil_status) },
          { label: "Citizenship", value: r.citizenship },
          { label: "Religion", value: r.religion ?? "" },
          { label: "Blood type", value: r.blood_type ?? "" },
          { label: "Education", value: title(r.educational_attainment) },
          { label: "Occupation", value: r.occupation ?? "" },
          { label: "Employment", value: title(r.employment_status) },
          { label: "Mobile", value: r.mobile ?? "" },
          { label: "Telephone", value: r.tel_no ?? "" },
          { label: "Email", value: r.email ?? "" },
          { label: "Address", value: address, wide: true },
          { label: "Purok", value: r.purok?.name ?? r.household?.purok?.name ?? "" },
          { label: "Resident since", value: longDate(r.residency_start_date) },
          { label: "Type of resident", value: title(r.type_of_resident) },
          { label: "Registered voter", value: r.is_registered_voter ? `Yes${r.last_voted_year ? ` (last voted ${r.last_voted_year})` : ""}` : "No" },
          { label: "PhilSys no.", value: maskPhilSys(r.philsys_card_no) },
          { label: "Record status", value: r.is_deceased ? "Deceased" : r.is_archived ? "Archived" : "Active" },
        ],
      });
    }

    if (key === "household") {
      const h = r.household;
      out.push({
        title: "Household & members",
        fields: h
          ? [
              { label: "Household no.", value: h.household_no },
              { label: "Purok", value: h.purok?.name ?? "" },
              { label: "Address", value: h.address, wide: true },
              { label: "Head of household", value: h.household_head ? naturalName(h.household_head) : "" },
              { label: "Housing", value: title(h.housing_type) },
              { label: "Water source", value: title(h.water_source) },
              { label: "Toilet", value: title(h.comfort_room) },
            ]
          : [{ label: "Household", value: "Not assigned to a household", wide: true }],
        tables: h
          ? [
              {
                title: `Members (${h.members.length})`,
                columns: [
                  { header: "Name", width: "44%" },
                  { header: "Sex", width: "14%" },
                  { header: "Age", width: "10%" },
                  { header: "Civil status", width: "18%" },
                  { header: "Note", width: "14%" },
                ],
                rows: h.members.map((m) => [
                  naturalName(m) + (m.id === r.id ? " (this person)" : ""),
                  title(m.sex),
                  String(ageOn(new Date(m.birthdate), now)),
                  CIVIL[m.civil_status] ?? title(m.civil_status),
                  m.id === h.household_head?.id ? "Head" : m.is_deceased ? "Deceased" : m.is_archived ? "Archived" : "",
                ]),
                empty: "No members recorded.",
              },
            ]
          : [],
      });
    }

    if (key === "certificates") {
      out.push({
        title: "Certificates issued",
        tables: [
          {
            columns: [
              { header: "Requested", width: "16%" },
              { header: "Queue no.", width: "16%" },
              { header: "Document", width: "26%" },
              { header: "Purpose", width: "20%" },
              { header: "Status", width: "10%" },
              { header: "Released", width: "12%" },
            ],
            rows: r.certificates.map((c) => [
              date(c.requested_at),
              c.queue_number,
              CERT[c.certificate_type] ?? title(c.certificate_type),
              c.purpose,
              title(c.status),
              c.status === "RELEASED" ? date(c.issued_at) : "",
            ]),
            empty: "No certificates requested.",
          },
        ],
      });
    }

    if (key === "health") {
      out.push({
        title: "Health records & vaccinations",
        tables: [
          {
            title: "Health records",
            columns: [
              { header: "Date", width: "18%" },
              { header: "Type", width: "24%" },
              { header: "Notes", width: "58%" },
            ],
            rows: r.health_records.map((h) => [date(h.recorded_at), title(h.record_type), h.notes ?? ""]),
            empty: "No health records.",
          },
          {
            title: "Vaccinations",
            columns: [
              { header: "Date given", width: "18%" },
              { header: "Vaccine", width: "82%" },
            ],
            rows: r.vaccinations.map((v) => [date(v.date_given), v.vaccine_name]),
            empty: "No vaccinations recorded.",
          },
        ],
      });
    }

    if (key === "assistance") {
      const sectors = [
        ...r.sectors.map((x) => title(x.sector_type === "4PS" ? "4Ps" : x.sector_type)),
        ...r.special_registries.map((x) => (x.registry_type === "FOUR_PS" ? "4Ps" : x.registry_type === "PWD" ? `PWD${x.disability_type ? ` (${x.disability_type})` : ""}` : title(x.registry_type))),
      ];
      out.push({
        title: "Government assistance & sectors",
        fields: [{ label: "Sectors / registries", value: [...new Set(sectors)].join(", ") || "None", wide: true }],
        tables: [
          {
            title: "Assistance programs",
            columns: [
              { header: "Program", width: "40%" },
              { header: "Enrolled", width: "18%" },
              { header: "Notes", width: "42%" },
            ],
            rows: r.government_assistance.map((a) => [a.program_name, date(a.date_enrolled), a.notes ?? ""]),
            empty: "No government assistance recorded.",
          },
        ],
      });
    }

    if (key === "blotter") {
      const cases = [
        ...r.blotter_as_complainant.map((c) => ({ ...c, role: "Complainant" })),
        ...r.blotter_as_respondent.map((c) => ({ ...c, role: "Respondent" })),
      ].sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime());
      out.push({
        title: "Blotter involvement",
        tables: [
          {
            columns: [
              { header: "Case no.", width: "22%" },
              { header: "Role", width: "16%" },
              { header: "Incident", width: "30%" },
              { header: "Incident date", width: "16%" },
              { header: "Status", width: "16%" },
            ],
            rows: cases.map((c) => [c.case_number, c.role, c.incident_type, date(c.incident_date), title(c.status)]),
            empty: "Not involved in any blotter case.",
          },
        ],
      });
    }
  }
  return out;
}