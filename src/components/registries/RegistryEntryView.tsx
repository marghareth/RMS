// FILE: src/components/registries/RegistryEntryView.tsx
//
// The body of a registry entry (senior citizen, PWD, 4Ps), shared by the
// slide-over (RegistryDetailSheet) and the full page (RegistryDetail) so the
// two always look the same.
//
// Redesign (Nov 2026): same quiet style as the Users list. No colored icon
// tiles, banners, pills or ALL-CAPS labels. A short summary row up top,
// then plain sections with label/value rows. Stored codes such as BELOW_5K
// or COLLEGE UNDERGRAD. are shown in words, the duplicate "Registry info"
// card is gone (it repeated the summary), and the four record lists
// (certificates, IDs, health, vaccinations) sit together under "Records".
"use client";

import Link from "next/link";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type RegistryType = "SENIOR_CITIZEN" | "PWD" | "FOUR_PS";

export interface RegistryResident {
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
  employment_status: string | null;
  educational_attainment: string | null;
  occupation: string | null;
  income_bracket: string | null;
  sector: string | null;
  purok: { id: number; name: string } | null;
  household: {
    id: number;
    household_no: string;
    address: string;
    housing_type: string | null;
    water_source: string | null;
    comfort_room: string | null;
    _count: { members: number };
  } | null;
  certificates: { id: number; certificate_type: string; issued_at: string }[];
  barangay_ids: { id: number; id_number: string; issued_date: string }[];
  health_records: { id: number; record_type: string; notes: string | null; recorded_at: string }[];
  vaccinations: { id: number; vaccine_name: string; date_given: string }[];
}

export interface RegistryEntry {
  id: number;
  resident_id: number;
  registry_type: RegistryType;
  disability_type: string | null;
  is_4ps_beneficiary: boolean;
  registered_at: string;
  resident: RegistryResident;
}

// ─── WORDING ─────────────────────────────────────────────────────────────────
export const REGISTRY_LABEL: Record<RegistryType, string> = {
  SENIOR_CITIZEN: "Senior citizen",
  PWD: "Person with disability",
  FOUR_PS: "4Ps beneficiary",
};

// Same wording as the resident form (residents/[id]/edit).
const VALUE_LABELS: Record<string, string> = {
  BELOW_5K: "Below ₱5,000",
  "5K_10K": "₱5,000 – ₱10,000",
  "10K_20K": "₱10,000 – ₱20,000",
  "20K_40K": "₱20,000 – ₱40,000",
  ABOVE_40K: "Above ₱40,000",
  "NO FORMAL": "No formal education",
  "ELEM.": "Elementary",
  "HIGH SCHOOL": "High school",
  "COLLEGE UNDERGRAD.": "College undergraduate",
  "COLLEGE GRAD.": "College graduate",
  "POST GRAD.": "Post graduate",
  SELF_EMPLOYED: "Self-employed",
  LIVE_IN: "Live-in",
  SENIOR: "Senior citizen",
  PWD: "PWD",
  "4PS": "4Ps beneficiary",
  "N/A": "None",
};

/** "COLLEGE UNDERGRAD." → "College undergraduate"; "FEMALE" → "Female". */
export function words(v: string | null | undefined): string | null {
  if (!v) return null;
  if (VALUE_LABELS[v]) return VALUE_LABELS[v];
  // Already mixed case (typed by staff, e.g. "Carmen, Cebu"): keep it.
  if (v !== v.toUpperCase()) return v;
  const s = v.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function calcAge(birthdate: string, on = new Date()) {
  const dob = new Date(birthdate);
  let age = on.getFullYear() - dob.getFullYear();
  const m = on.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
  return age;
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function rbiId(id: number) {
  return `BM${String(id).padStart(7, "0")}`;
}
export function displayName(r: RegistryResident) {
  return `${r.lname}, ${r.fname}${r.name_extension ? " " + r.name_extension : ""}${r.mname ? " " + r.mname[0] + "." : ""}`;
}

/** One line under the name: "RBI BM0000299 · Purok III · 79 years old". */
export function entrySubtitle(entry: RegistryEntry) {
  const r = entry.resident;
  return [`RBI ${rbiId(r.id)}`, r.purok?.name, `${calcAge(r.birthdate)} years old`].filter(Boolean).join(" · ");
}

// ─── BUILDING BLOCKS ─────────────────────────────────────────────────────────
function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#F0F1F3] pt-5 dark:border-[#262626]">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">{children}</dl>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5">
      <dt className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</dt>
      <dd className={`text-[13px] ${empty ? "text-[#C4C8CE] dark:text-[#525252]" : "text-[#1F2937] dark:text-[#E5E5E5]"}`}>
        {empty ? "Not recorded" : value}
      </dd>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-medium text-[#1F2937] dark:text-white">{value}</p>
    </div>
  );
}

/** A short dated list with a count; shows the first few. */
function RecordList<T extends { id: number }>({
  title,
  items,
  empty,
  max = 4,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  max?: number;
  render: (item: T) => { main: string; sub?: string | null; date: string };
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[12.5px] font-medium text-[#374151] dark:text-[#D4D4D4]">
        {title} <span className="font-normal text-[#9CA3AF] dark:text-[#737373]">{items.length}</span>
      </p>
      {items.length === 0 ? (
        <p className="py-1 text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">{empty}</p>
      ) : (
        <ul>
          {items.slice(0, max).map((it) => {
            const { main, sub, date } = render(it);
            return (
              <li key={it.id} className="flex items-baseline justify-between gap-3 border-b border-[#F4F5F7] py-1.5 last:border-0 dark:border-[#262626]">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">{main}</p>
                  {sub && <p className="truncate text-[12px] text-[#9CA3AF] dark:text-[#737373]">{sub}</p>}
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-[#9CA3AF] dark:text-[#737373]">{date}</span>
              </li>
            );
          })}
          {items.length > max && (
            <li className="pt-1 text-[12px] text-[#9CA3AF] dark:text-[#737373]">and {items.length - max} more on the RBI profile</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── BODY ────────────────────────────────────────────────────────────────────
export default function RegistryEntryView({ entry }: { entry: RegistryEntry }) {
  const r = entry.resident;

  // The fourth summary item depends on the registry.
  let extra: { label: string; value: React.ReactNode };
  if (entry.registry_type === "PWD") {
    extra = { label: "Disability", value: entry.disability_type || "Not specified" };
  } else if (entry.registry_type === "FOUR_PS") {
    extra = {
      label: "4Ps status",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${entry.is_4ps_beneficiary ? "bg-green-500" : "bg-[#9CA3AF]"}`} />
          {entry.is_4ps_beneficiary ? "Active" : "Inactive"}
        </span>
      ),
    };
  } else {
    const turned60 = new Date(r.birthdate);
    turned60.setFullYear(turned60.getFullYear() + 60);
    extra = { label: "Turned 60", value: fmtDate(turned60.toISOString()) };
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Summary label="On the registry since" value={fmtDate(entry.registered_at)} />
        <Summary label="Age" value={`${calcAge(r.birthdate)} years old`} />
        <Summary label="Born" value={fmtDate(r.birthdate)} />
        <Summary label={extra.label} value={extra.value} />
      </div>

      <Section title="Personal">
        <Rows>
          <Row label="Sex" value={words(r.sex)} />
          <Row label="Civil status" value={words(r.civil_status)} />
          <Row label="Place of birth" value={r.place_of_birth} />
          <Row label="Citizenship" value={words(r.citizenship)} />
          <Row label="Religion" value={words(r.religion)} />
        </Rows>
      </Section>

      <Section title="Work and income">
        <Rows>
          <Row label="Employment" value={words(r.employment_status)} />
          <Row label="Occupation" value={words(r.occupation)} />
          <Row label="Education" value={words(r.educational_attainment)} />
          <Row label="Monthly income" value={words(r.income_bracket)} />
          <Row label="Sector" value={r.sector && r.sector !== "N/A" ? words(r.sector) : null} />
        </Rows>
      </Section>

      <Section
        title="Household"
        aside={
          r.household && (
            <Link href={`/households/${r.household.id}`} className="text-[12.5px] font-medium text-(--brand-fg) hover:underline">
              View household
            </Link>
          )
        }
      >
        {r.household ? (
          <Rows>
            <Row label="Household no." value={r.household.household_no} />
            <Row label="Purok" value={r.purok?.name} />
            <Row label="Address" value={r.household.address} />
            <Row label="Members" value={r.household._count?.members} />
            <Row label="Housing" value={words(r.household.housing_type)} />
            <Row label="Water source" value={words(r.household.water_source)} />
            <Row label="Comfort room" value={words(r.household.comfort_room)} />
          </Rows>
        ) : (
          <p className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">
            Not linked to a household{r.purok ? ` · ${r.purok.name}` : ""}.
          </p>
        )}
      </Section>

      <Section title="Records">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <RecordList
            title="Certificates"
            items={r.certificates}
            empty="None issued yet"
            render={(c) => ({ main: words(c.certificate_type) ?? "", date: fmtShort(c.issued_at) })}
          />
          <RecordList
            title="Barangay IDs"
            items={r.barangay_ids}
            empty="None issued yet"
            render={(b) => ({ main: b.id_number, date: fmtShort(b.issued_date) })}
          />
          <RecordList
            title="Health records"
            items={r.health_records}
            empty="None recorded"
            render={(h) => ({ main: words(h.record_type) ?? "", sub: h.notes, date: fmtShort(h.recorded_at) })}
          />
          <RecordList
            title="Vaccinations"
            items={r.vaccinations}
            empty="None recorded"
            render={(v) => ({ main: v.vaccine_name, date: fmtShort(v.date_given) })}
          />
        </div>
      </Section>
    </div>
  );
}