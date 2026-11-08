// FILE: src/components/residents/ResidentDetailSheet.tsx
//
// The resident profile view — personal info, address, sectoral tags,
// beneficiary programs, household, certificates, blotter, health records,
// activity history — as a slide-over instead of a full page navigation.
// Content mirrors (dashboard)/residents/[id]/page.tsx (which still exists
// for direct links/bookmarks), just re-homed so it can render inside
// <Sheet> and be driven by a `residentId` prop from the residents list page.
//
// Redesign (Nov 2026): same quiet style as the Users list and the registry
// panel. Name in normal case with one plain line under it, a summary row,
// plain sections with two-column label/value rows (stored codes such as
// 10K_20K or HIGH SCHOOL shown in words, empty fields as "Not recorded"),
// the address shown once instead of split into ten rows, no pills, colored
// badges or ALL-CAPS labels, and text links instead of icon buttons.
//
// "Edit" stays a real page navigation (a large multi-section form, not a
// detail view) and "View All Household Members" stays a real page
// navigation too, per the established cross-link convention.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { lifeEventProblems, sectorAgeProblem, problemFor } from "@/lib/form-rules";
import FieldError from "@/components/shared/FieldError";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useCan } from "@/lib/hooks/useCan";
import { words } from "@/components/registries/RegistryEntryView";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Purok     { id: number; name: string }
interface Household {
  id: number; household_no: string; address: string;
  housing_type: string | null; water_source: string | null; comfort_room: string | null;
  members: Resident[];
}
interface Certificate { id: number; certificate_type: string; purpose: string; issued_at: string | null; status?: string; queue_number?: string }
interface SpecialRegistry { id: number; registry_type: string; disability_type: string | null }
interface HealthRecord { id: number; record_type: string; notes: string | null; recorded_at: string }
interface Vaccination { id: number; vaccine_name: string; date_given: string }
interface BarangayId  { id: number; id_number: string; issued_date: string }
interface DeceasedRecordLite { id: number; date_of_death: string }
interface ResidentSectorTag { id: number; sector_type: string }
interface GovernmentAssistanceRecord { id: number; program_name: string; date_enrolled: string | null; notes: string | null }
interface BlotterCaseLite {
  id: number; case_number: string; incident_narrative: string; incident_date: string;
  incident_type: string; status: string;
}
interface AuditLogEntry {
  id: number; action: string; table_affected: string; details: string | null;
  performed_at: string; user: { username: string } | null;
}

interface Resident {
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
  is_deceased: boolean;
  created_at: string;
  updated_at: string;
  purok: Purok | null;
  household: Household | null;
  certificates: Certificate[];
  special_registries: SpecialRegistry[];
  health_records: HealthRecord[];
  vaccinations: Vaccination[];
  barangay_ids: BarangayId[];

  // ── Resident Profile Enhancements (2.9) ──
  email: string | null;
  mobile: string | null;
  tel_no: string | null;
  house_block_lot_no: string | null;
  street: string | null;
  subdivision_village: string | null;
  barangay: string | null;
  city_municipality: string | null;
  province: string | null;
  region: string | null;
  zip_code: string | null;
  philsys_card_no: string | null;
  gender: string | null;
  residence_of_mother_upon_birth: string | null;
  type_of_resident: string | null;
  mothers_maiden_name: string | null;
  ethnicity: string | null;
  blood_type: string | null;
  height_m: number | null;
  weight_kg: number | null;
  complexion: string | null;
  is_registered_voter: boolean;
  is_resident_voter: boolean;
  last_voted_year: number | null;
  deceased_record: DeceasedRecordLite | null;
  sectors: ResidentSectorTag[];
  government_assistance: GovernmentAssistanceRecord[];
  blotter_as_complainant: BlotterCaseLite[];
  blotter_as_respondent: BlotterCaseLite[];
  activity_history: AuditLogEntry[];
}

interface ResidentDetailSheetProps {
  /** The resident to show, or null to keep the sheet closed. */
  residentId: number | null;
  onClose: () => void;
  /** Called after a successful archive, so the list page can refetch. */
  onArchived?: () => void;
}

const SECTOR_TYPE_LABEL: Record<string, string> = {
  SENIOR: "Senior Citizen",
  PWD: "PWD",
  YOUTH: "Youth",
  SOLO_PARENT: "Solo Parent",
  "4PS": "4Ps",
  SOLO_BREADWINNER: "Solo Breadwinner",
  INDIGENOUS: "Indigenous",
  OTHER: "Other",
};
const ALL_SECTOR_TYPES = Object.keys(SECTOR_TYPE_LABEL);


// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function rbiId(id: number) { return `BM${String(id).padStart(7, "0")}`; }

function fullAddress(r: Resident): string {
  const parts = [
    r.house_block_lot_no,
    r.street,
    r.subdivision_village,
    r.barangay || r.household?.address,
    r.city_municipality,
    r.province,
    r.region,
    r.zip_code,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

// ── BUILDING BLOCKS ──────────────────────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t border-[#F0F1F3] pt-5 dark:border-[#262626]">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">{children}</dl>;
}

function Row({ label, value, wide }: { label: string; value?: React.ReactNode; wide?: boolean }) {
  const empty = value === null || value === undefined || value === "" || value === "—";
  return (
    <div className={`grid grid-cols-[8.5rem_1fr] gap-3 py-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</dt>
      <dd className={`min-w-0 wrap-break-word text-[13px] ${empty ? "text-[#C4C8CE] dark:text-[#525252]" : "text-[#1F2937] dark:text-[#E5E5E5]"}`}>
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

/** Quiet text button, like Edit / Deactivate on the Users list. */
function TextBtn({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-1 text-[12.5px] font-medium transition disabled:opacity-50 ${
        danger
          ? "text-[#6B7280] hover:text-[#DC2626] dark:text-[#A3A3A3] dark:hover:text-[#F87171]"
          : "text-(--brand-fg) hover:underline"
      }`}
    >
      {children}
    </button>
  );
}

function Dot({ tone, children }: { tone: "red" | "amber" | "blue" | "green" | "gray"; children: React.ReactNode }) {
  const c = { red: "bg-red-500", amber: "bg-amber-500", blue: "bg-(--brand)", green: "bg-green-500", gray: "bg-[#9CA3AF]" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#374151] dark:text-[#D4D4D4]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c}`} />
      {children}
    </span>
  );
}

function shortDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ACTION_WORD: Record<string, string> = { CREATE: "Added", UPDATE: "Edited", DELETE: "Deleted", ARCHIVE: "Archived", EXPORT: "Exported" };

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ResidentDetailSheet({ residentId, onClose, onArchived }: ResidentDetailSheetProps) {
  const can = useCan();
  const router = useRouter();
  const open = residentId !== null;

  const [resident, setResident] = useState<Resident | null>(null);

  // Same "which id does the current result belong to" pattern as the
  // original full page — loading/notFound are *derived* during render
  // rather than set imperatively at the top of an effect, so there's no
  // setState call that runs synchronously inside the effect body (which is
  // what react-hooks/set-state-in-effect flags). The actual setState calls
  // only happen inside the fetch's .then()/.catch() callbacks.
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [notFoundId, setNotFoundId] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Sectoral affiliations (2.9) ──
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState("");
  const [sectorBusy, setSectorBusy] = useState(false);

  // ── Government assistance / beneficiary info (2.9) ──
  const [assistanceFormOpen, setAssistanceFormOpen] = useState<"new" | number | null>(null);
  const [assistanceForm, setAssistanceForm] = useState({ program_name: "", date_enrolled: "", notes: "" });
  const [assistanceBusy, setAssistanceBusy] = useState(false);
  const [assistanceDeleteTarget, setAssistanceDeleteTarget] = useState<GovernmentAssistanceRecord | null>(null);

  const loading = residentId !== null && loadedId !== residentId && notFoundId !== residentId;
  const notFound = residentId !== null && notFoundId === residentId;

  // Whenever `residentId` changes (a new resident opened in this same sheet
  // instance), reset all transient/editing UI state synchronously during
  // render, matching the pattern used by the other detail sheets.
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (residentId !== null && residentId !== syncedId) {
    setSyncedId(residentId);
    setConfirmOpen(false);
    setAddingSector(false);
    setNewSector("");
    setAssistanceFormOpen(null);
    setAssistanceDeleteTarget(null);
  } else if (residentId === null && syncedId !== null) {
    setSyncedId(null);
  }

  const loadResident = useCallback(async () => {
    if (residentId === null) return;
    try {
      const res = await fetch(`/api/residents/${residentId}`);
      if (!res.ok) return;
      setResident(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [residentId]);

  useEffect(() => {
    if (residentId === null) return;
    let cancelled = false;

    fetch(`/api/residents/${residentId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setNotFoundId(residentId);
          return;
        }
        if (!res.ok) throw new Error("Failed to load resident");
        const data = await res.json();
        if (cancelled) return;
        setResident(data);
        setLoadedId(residentId);
      })
      .catch(() => {
        if (!cancelled) setNotFoundId(residentId);
      });

    return () => {
      cancelled = true;
    };
  }, [residentId]);

  const [sectorError, setSectorError] = useState("");

  async function handleAddSector() {
    if (!newSector || !resident) return;
    // Senior is 60+, Youth is 15–30 (src/lib/form-rules.ts; the API checks too).
    const ageProblem = sectorAgeProblem(newSector, resident.birthdate);
    if (ageProblem) { setSectorError(ageProblem); return; }
    setSectorBusy(true);
    setSectorError("");
    try {
      const res = await fetch("/api/resident-sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resident_id: resident.id, sector_type: newSector }),
      });
      if (!res.ok) {
        // It used to close the form as if it had worked.
        const data = await res.json().catch(() => ({}));
        setSectorError(data.message || "Couldn't add the tag. Try again.");
        return;
      }
      await loadResident();
      setAddingSector(false);
      setNewSector("");
    } catch (e) {
      console.error(e);
    } finally {
      setSectorBusy(false);
    }
  }

  async function handleRemoveSector(sectorId: number) {
    setSectorBusy(true);
    try {
      await fetch(`/api/resident-sectors/${sectorId}`, { method: "DELETE" });
      await loadResident();
    } catch (e) {
      console.error(e);
    } finally {
      setSectorBusy(false);
    }
  }

  function openAddAssistance() {
    setAssistanceForm({ program_name: "", date_enrolled: "", notes: "" });
    setAssistanceFormOpen("new");
  }
  function openEditAssistance(a: GovernmentAssistanceRecord) {
    setAssistanceForm({
      program_name: a.program_name,
      date_enrolled: a.date_enrolled ? a.date_enrolled.slice(0, 10) : "",
      notes: a.notes ?? "",
    });
    setAssistanceFormOpen(a.id);
  }

  const [assistanceError, setAssistanceError] = useState("");
  // Not before the resident was born, not in the future (src/lib/form-rules.ts).
  const enrolledError = resident
    ? problemFor(lifeEventProblems("date_enrolled", assistanceForm.date_enrolled, "Date enrolled", resident.birthdate), "date_enrolled")
    : undefined;

  async function handleSaveAssistance() {
    if (!assistanceForm.program_name.trim() || !resident) return;
    if (enrolledError) return;
    setAssistanceBusy(true);
    setAssistanceError("");
    try {
      const payload = {
        resident_id: resident.id,
        program_name: assistanceForm.program_name.trim(),
        date_enrolled: assistanceForm.date_enrolled || null,
        notes: assistanceForm.notes.trim() || null,
      };
      if (assistanceFormOpen === "new") {
        const res = await fetch("/api/government-assistance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setAssistanceError(d.message || "Couldn't save. Try again."); return; }
      } else {
        const res = await fetch(`/api/government-assistance/${assistanceFormOpen}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setAssistanceError(d.message || "Couldn't save. Try again."); return; }
      }
      await loadResident();
      setAssistanceFormOpen(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAssistanceBusy(false);
    }
  }

  async function handleDeleteAssistance() {
    if (!assistanceDeleteTarget) return;
    setAssistanceBusy(true);
    try {
      await fetch(`/api/government-assistance/${assistanceDeleteTarget.id}`, { method: "DELETE" });
      await loadResident();
      setAssistanceDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAssistanceBusy(false);
    }
  }

  async function handleArchive() {
    if (residentId === null) return;
    setArchiving(true);
    try {
      await fetch(`/api/residents/${residentId}`, { method: "DELETE" });
      onArchived?.();
      onClose();
    } finally {
      setArchiving(false);
    }
  }

  const displayName = resident
    ? `${resident.fname}${resident.name_extension ? " " + resident.name_extension : ""} ${resident.mname ? resident.mname[0] + ". " : ""}${resident.lname}`
    : "";
  const availableSectorTypes = resident ? ALL_SECTOR_TYPES.filter((t) => !resident.sectors.some((s) => s.sector_type === t)) : [];
  const blotterRecords = resident
    ? [
        ...resident.blotter_as_complainant.map((b) => ({ ...b, role: "Complainant" as const })),
        ...resident.blotter_as_respondent.map((b) => ({ ...b, role: "Respondent" as const })),
      ].sort((a, b) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())
    : [];

  const r = resident;
  const records = r
    ? [
        {
          title: "Certificates",
          empty: "None issued yet",
          items: r.certificates.map((c) => ({
            key: `c${c.id}`,
            main: words(c.certificate_type) ?? c.certificate_type,
            sub: c.purpose,
            date: shortDate(c.issued_at) ?? words(c.status ?? "Pending"),
          })),
        },
        {
          title: "Barangay IDs",
          empty: "None issued yet",
          items: r.barangay_ids.map((b) => ({ key: `b${b.id}`, main: b.id_number, sub: null, date: shortDate(b.issued_date) })),
        },
        {
          title: "Health records",
          empty: "None recorded",
          items: r.health_records.map((h) => ({
            key: `h${h.id}`,
            main: words(h.record_type) ?? h.record_type,
            sub: h.notes,
            date: shortDate(h.recorded_at),
          })),
        },
        {
          title: "Vaccinations",
          empty: "None recorded",
          items: r.vaccinations.map((v) => ({ key: `v${v.id}`, main: v.vaccine_name, sub: null, date: shortDate(v.date_given) })),
        },
      ]
    : [];

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || notFound || !r ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Resident not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Resident not found"
                  description="This resident doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[17px] font-semibold">{displayName}</SheetTitle>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                  <span>{["RBI " + rbiId(r.id), `${calcAge(r.birthdate)} years old`, words(r.sex), r.purok?.name].filter(Boolean).join(" · ")}</span>
                  {r.is_deceased && <Dot tone="gray">Deceased</Dot>}
                  {r.is_archived && <Dot tone="amber">Archived</Dot>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {can("residents:write") && (
                  <button
                    onClick={() => router.push(`/residents/${r.id}/edit`)}
                    className="rounded-lg bg-(--brand) px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-(--brand-hover)"
                  >
                    Edit
                  </button>
                )}
                {!r.is_archived && can("residents:delete") && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={archiving}
                    className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-[#6B7280] transition hover:text-[#DC2626] disabled:opacity-50 dark:text-[#A3A3A3] dark:hover:text-[#F87171]"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => router.push(`/residents/${r.id}`)}
                  title="Open as a full page"
                  aria-label="Open as a full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <Summary label="Born" value={formatDate(r.birthdate)} />
                  <Summary label="Civil status" value={words(r.civil_status) ?? "—"} />
                  <Summary label="Purok" value={r.purok?.name ?? "—"} />
                  <Summary
                    label="Household"
                    value={
                      r.household ? (
                        <button
                          onClick={() => router.push(`/households/${r.household!.id}`)}
                          className="text-(--brand-fg) hover:underline"
                        >
                          {r.household.household_no}
                        </button>
                      ) : (
                        "None"
                      )
                    }
                  />
                </div>

                {/* Personal */}
                <Section title="Personal">
                  <Rows>
                    <Row label="Sex" value={words(r.sex)} />
                    <Row label="Gender" value={words(r.gender)} />
                    <Row label="Type of resident" value={words(r.type_of_resident)} />
                    <Row label="Religion" value={words(r.religion)} />
                    <Row label="Citizenship" value={words(r.citizenship)} />
                    <Row label="Nationality" value={words(r.nationality)} />
                    <Row label="Place of birth" value={r.place_of_birth} />
                    <Row label="PhilSys card no." value={r.philsys_card_no} />
                    <Row label="Mother’s maiden name" value={r.mothers_maiden_name} />
                    <Row label="Mother’s residence at birth" value={r.residence_of_mother_upon_birth} />
                  </Rows>
                </Section>

                {/* Contact and address */}
                <Section title="Contact and address">
                  <Rows>
                    <Row label="Mobile" value={r.mobile} />
                    <Row label="Email" value={r.email} />
                    <Row label="Telephone" value={r.tel_no} />
                    <Row label="ZIP code" value={r.zip_code} />
                    <Row label="Address" value={fullAddress(r)} wide />
                  </Rows>
                </Section>

                {/* Work and income */}
                <Section title="Work and income">
                  <Rows>
                    <Row label="Education" value={words(r.educational_attainment)} />
                    <Row label="Employment" value={words(r.employment_status)} />
                    <Row label="Occupation" value={words(r.occupation)} />
                    <Row label="Monthly income" value={words(r.income_bracket)} />
                    <Row label="Sector" value={r.sector && r.sector !== "N/A" ? words(r.sector) : null} />
                  </Rows>
                </Section>

                {/* Identity and voting */}
                <Section title="Identity and voting">
                  <Rows>
                    <Row label="Ethnicity" value={r.ethnicity} />
                    <Row label="Blood type" value={r.blood_type} />
                    <Row label="Height" value={r.height_m != null ? `${r.height_m} m` : null} />
                    <Row label="Weight" value={r.weight_kg != null ? `${r.weight_kg} kg` : null} />
                    <Row label="Complexion" value={words(r.complexion)} />
                    <Row
                      label="Voter"
                      value={
                        r.is_registered_voter
                          ? r.is_resident_voter
                            ? "Registered here"
                            : "Registered elsewhere"
                          : "Not registered"
                      }
                    />
                    <Row label="Last voted" value={r.last_voted_year} />
                  </Rows>
                </Section>

                {/* Sectors and registries */}
                <Section
                  title="Sectors and registries"
                  action={
                    !addingSector && availableSectorTypes.length > 0 && can("residents:write") && (
                      <TextBtn onClick={() => setAddingSector(true)}>Add sector</TextBtn>
                    )
                  }
                >
                  {addingSector && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={newSector}
                          onChange={(e) => { setNewSector(e.target.value); setSectorError(""); }}
                          aria-label="Sector"
                          className="flex-1 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-(--brand-line)"
                        >
                          <option value="">Choose a sector</option>
                          {availableSectorTypes.map((t) => (
                            <option key={t} value={t}>{SECTOR_TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddSector}
                          disabled={!newSector || sectorBusy}
                          className="rounded-lg bg-(--brand) px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-(--brand-hover) disabled:opacity-50"
                        >
                          Add
                        </button>
                        <TextBtn danger onClick={() => { setAddingSector(false); setNewSector(""); setSectorError(""); }}>
                          Cancel
                        </TextBtn>
                      </div>
                      <FieldError message={sectorError} />
                    </div>
                  )}
                  <Rows>
                    <Row
                      label="Sectors"
                      wide
                      value={
                        r.sectors.length ? (
                          <span className="flex flex-wrap gap-x-4 gap-y-1">
                            {r.sectors.map((s) => (
                              <span key={s.id} className="inline-flex items-baseline gap-1.5">
                                {SECTOR_TYPE_LABEL[s.sector_type] ?? s.sector_type}
                                {can("residents:delete") && (
                                  <button
                                    onClick={() => handleRemoveSector(s.id)}
                                    disabled={sectorBusy}
                                    aria-label={`Remove ${SECTOR_TYPE_LABEL[s.sector_type] ?? s.sector_type}`}
                                    className="text-[12px] text-[#9CA3AF] transition hover:text-[#DC2626] disabled:opacity-50 dark:text-[#737373]"
                                  >
                                    Remove
                                  </button>
                                )}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "None"
                        )
                      }
                    />
                    <Row
                      label="Registries"
                      wide
                      value={
                        r.special_registries.length
                          ? r.special_registries
                              .map((sr) =>
                                sr.registry_type === "FOUR_PS"
                                  ? "4Ps beneficiary"
                                  : sr.registry_type === "PWD"
                                    ? `PWD${sr.disability_type ? ` (${sr.disability_type})` : ""}`
                                    : "Senior citizen"
                              )
                              .join(" · ")
                          : "None"
                      }
                    />
                  </Rows>
                </Section>

                {/* Assistance programs */}
                <Section
                  title="Assistance programs"
                  action={assistanceFormOpen === null && can("residents:write") && <TextBtn onClick={openAddAssistance}>Add program</TextBtn>}
                >
                  {assistanceFormOpen !== null && (
                    <div className="mb-3 space-y-2 rounded-lg border border-[#E9EAEC] p-3 dark:border-[#262626]">
                      <input
                        value={assistanceForm.program_name}
                        onChange={(e) => setAssistanceForm((f) => ({ ...f, program_name: e.target.value }))}
                        placeholder="Program name, e.g. 4Ps"
                        aria-label="Program name"
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-(--brand-line)"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={assistanceForm.date_enrolled}
                          onChange={(e) => setAssistanceForm((f) => ({ ...f, date_enrolled: e.target.value }))}
                          min={r.birthdate?.slice(0, 10)}
                          max={new Date().toLocaleDateString("en-CA")}
                          aria-label="Date enrolled"
                          aria-invalid={!!enrolledError}
                          className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-(--brand-line)"
                        />
                        <input
                          value={assistanceForm.notes}
                          onChange={(e) => setAssistanceForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="Notes (optional)"
                          aria-label="Notes"
                          className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-(--brand-line)"
                        />
                      </div>
                      <FieldError message={enrolledError || assistanceError} />
                      <div className="flex justify-end gap-2">
                        <TextBtn danger onClick={() => setAssistanceFormOpen(null)}>Cancel</TextBtn>
                        <button
                          onClick={handleSaveAssistance}
                          disabled={assistanceBusy || !assistanceForm.program_name.trim() || !!enrolledError}
                          className="rounded-lg bg-(--brand) px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-(--brand-hover) disabled:opacity-50"
                        >
                          {assistanceBusy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {r.government_assistance.length === 0 ? (
                    <p className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">None on file</p>
                  ) : (
                    <ul>
                      {r.government_assistance.map((a) => (
                        <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-[#F4F5F7] py-2 last:border-0 dark:border-[#262626]">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1F2937] dark:text-white">{a.program_name}</p>
                            <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                              {a.date_enrolled ? `Enrolled ${shortDate(a.date_enrolled)}` : "Enrollment date not recorded"}
                              {a.notes ? ` · ${a.notes}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {can("residents:write") && <TextBtn onClick={() => openEditAssistance(a)}>Edit</TextBtn>}
                            {can("residents:delete") && <TextBtn danger onClick={() => setAssistanceDeleteTarget(a)}>Remove</TextBtn>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Household */}
                <Section
                  title="Household"
                  action={
                    r.household && (
                      <TextBtn onClick={() => router.push(`/households/${r.household!.id}`)}>
                        View household ({r.household.members?.length ?? 0} {(r.household.members?.length ?? 0) === 1 ? "member" : "members"})
                      </TextBtn>
                    )
                  }
                >
                  {r.household ? (
                    <Rows>
                      <Row label="Household no." value={r.household.household_no} />
                      <Row label="Housing" value={words(r.household.housing_type)} />
                      <Row label="Water source" value={words(r.household.water_source)} />
                      <Row label="Comfort room" value={words(r.household.comfort_room)} />
                      <Row label="Address" value={r.household.address} wide />
                    </Rows>
                  ) : (
                    <p className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">Not linked to a household.</p>
                  )}
                </Section>

                {/* Records */}
                <Section title="Records">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {records.map((g) => (
                      <div key={g.title} className="min-w-0">
                        <p className="mb-1 text-[12.5px] font-medium text-[#374151] dark:text-[#D4D4D4]">
                          {g.title} <span className="font-normal text-[#9CA3AF] dark:text-[#737373]">{g.items.length}</span>
                        </p>
                        {g.items.length === 0 ? (
                          <p className="py-1 text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">{g.empty}</p>
                        ) : (
                          <ul>
                            {g.items.slice(0, 4).map((it) => (
                              <li key={it.key} className="flex items-baseline justify-between gap-3 border-b border-[#F4F5F7] py-1.5 last:border-0 dark:border-[#262626]">
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">{it.main}</p>
                                  {it.sub && <p className="truncate text-[12px] text-[#9CA3AF] dark:text-[#737373]">{it.sub}</p>}
                                </div>
                                <span className="shrink-0 text-[12px] tabular-nums text-[#9CA3AF] dark:text-[#737373]">{it.date}</span>
                              </li>
                            ))}
                            {g.items.length > 4 && (
                              <li className="pt-1 text-[12px] text-[#9CA3AF] dark:text-[#737373]">and {g.items.length - 4} more</li>
                            )}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Blotter */}
                <Section title="Blotter cases" action={<span className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">{blotterRecords.length}</span>}>
                  {blotterRecords.length === 0 ? (
                    <p className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">None</p>
                  ) : (
                    <ul>
                      {blotterRecords.slice(0, 5).map((b) => (
                        <li
                          key={`${b.role}-${b.id}`}
                          className="flex items-baseline justify-between gap-3 border-b border-[#F4F5F7] py-2 last:border-0 dark:border-[#262626]"
                        >
                          <div className="min-w-0">
                            <button
                              onClick={() => router.push(`/blotter/${b.id}`)}
                              className="font-mono text-[12.5px] font-medium text-(--brand-fg) hover:underline"
                            >
                              {b.case_number}
                            </button>
                            <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                              {[words(b.incident_type), shortDate(b.incident_date), words(b.status)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <Dot tone={b.role === "Complainant" ? "blue" : "amber"}>{b.role}</Dot>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Activity */}
                <Section title="Activity">
                  {r.activity_history.length === 0 ? (
                    <p className="text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">No recorded activity yet</p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto pr-1">
                      {r.activity_history.map((a) => (
                        <li key={a.id} className="border-b border-[#F4F5F7] py-2 last:border-0 dark:border-[#262626]">
                          <p className="text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">
                            {a.details ?? `${ACTION_WORD[a.action] ?? words(a.action)} ${words(a.table_affected)?.toLowerCase() ?? ""}`}
                          </p>
                          <p className="text-[12px] text-[#9CA3AF] dark:text-[#737373]">
                            {ACTION_WORD[a.action] ?? words(a.action)} · {formatDateTime(a.performed_at)}
                            {a.user ? ` · ${a.user.username}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <p className="border-t border-[#F0F1F3] pt-4 text-[12px] text-[#9CA3AF] dark:border-[#262626] dark:text-[#737373]">
                  Registered {shortDate(r.created_at)} · Last updated {shortDate(r.updated_at)}
                </p>
              </div>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={confirmOpen}
      title="Archive resident?"
      message="This resident will be hidden from the main list. You can restore them later from the admin panel."
      confirmLabel="Archive"
      cancelLabel="Cancel"
      variant="warning"
      loading={archiving}
      onConfirm={handleArchive}
      onCancel={() => setConfirmOpen(false)}
    />

    <ConfirmDialog
      open={!!assistanceDeleteTarget}
      title="Remove assistance record?"
      message={assistanceDeleteTarget ? `The "${assistanceDeleteTarget.program_name}" program record will be permanently removed.` : ""}
      confirmLabel={assistanceBusy ? "Removing..." : "Remove"}
      cancelLabel="Cancel"
      variant="danger"
      loading={assistanceBusy}
      onConfirm={handleDeleteAssistance}
      onCancel={() => setAssistanceDeleteTarget(null)}
    />
    </>
  );
}