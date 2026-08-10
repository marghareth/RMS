// src/components/residents/ResidentDetailSheet.tsx
//
// The resident profile view — personal info, address, sectoral tags,
// beneficiary programs, household, certificates, blotter, health records,
// activity history — as a slide-over instead of a full page navigation.
// Content mirrors (dashboard)/residents/[id]/page.tsx (which still exists
// for direct links/bookmarks), just re-homed so it can render inside
// <Sheet> and be driven by a `residentId` prop from the residents list page.
//
// "Edit" stays a real page navigation (a large multi-section form, not a
// detail view) and "View All Household Members" stays a real page
// navigation too, per the established cross-link convention.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Plus, X, Trash2, ExternalLink, Users } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

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

const ACTION_COLOR: Record<string, "blue" | "green" | "amber" | "red"> = {
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  ARCHIVE: "amber",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
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
  return parts.length ? parts.join(", ") : "—";
}

// ── SECTION ───────────────────────────────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-40 shrink-0">{label}</span>
      <span className="text-[11px] text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

function Badge({ label, color = "blue" }: { label: string; color?: "blue" | "green" | "amber" | "red" }) {
  const cls = {
    blue:  "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red:   "bg-red-100 text-red-700",
  }[color];
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>;
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ResidentDetailSheet({ residentId, onClose, onArchived }: ResidentDetailSheetProps) {
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

  async function handleAddSector() {
    if (!newSector || !resident) return;
    setSectorBusy(true);
    try {
      await fetch("/api/resident-sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resident_id: resident.id, sector_type: newSector }),
      });
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

  async function handleSaveAssistance() {
    if (!assistanceForm.program_name.trim() || !resident) return;
    setAssistanceBusy(true);
    try {
      const payload = {
        resident_id: resident.id,
        program_name: assistanceForm.program_name.trim(),
        date_enrolled: assistanceForm.date_enrolled || null,
        notes: assistanceForm.notes.trim() || null,
      };
      if (assistanceFormOpen === "new") {
        await fetch("/api/government-assistance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/government-assistance/${assistanceFormOpen}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
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

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || notFound || !resident ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Resident not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
                <SheetTitle className="truncate uppercase tracking-wide">{displayName}</SheetTitle>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{rbiId(resident.id)} · {resident.sex}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {resident.is_archived && <Badge label="Archived" color="red" />}
                {resident.is_deceased && <Badge label="Deceased" color="red" />}
                <button
                  onClick={() => router.push(`/residents/${resident.id}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition"
                >
                  <Pencil size={13} /> Edit
                </button>
                {!resident.is_archived && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    disabled={archiving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition"
                  >
                    <Archive size={13} /> Archive
                  </button>
                )}
                <button
                  onClick={() => router.push(`/residents/${resident.id}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              {/* Content grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* 1. Personal Information */}
                <Section title="Personal Information">
                  <Row label="RBI ID"            value={rbiId(resident.id)} />
                  <Row label="PhilSys Card No."  value={resident.philsys_card_no} />
                  <Row label="Date of Birth"     value={formatDate(resident.birthdate)} />
                  <Row label="Place of Birth"    value={resident.place_of_birth} />
                  <Row label="Age"               value={calcAge(resident.birthdate)} />
                  <Row label="Sex"               value={resident.sex} />
                  <Row label="Gender"            value={resident.gender} />
                  <Row label="Civil Status"      value={resident.civil_status.replace("_", "-")} />
                  <Row label="Type of Resident"  value={resident.type_of_resident} />
                  <Row label="Citizenship"       value={resident.citizenship} />
                  <Row label="Nationality"       value={resident.nationality} />
                  <Row label="Religion"          value={resident.religion} />
                  <Row label="Mother's Maiden Name" value={resident.mothers_maiden_name} />
                  <Row label="Mother's Residence at Birth" value={resident.residence_of_mother_upon_birth} />
                </Section>

                {/* Socio-Economic */}
                <Section title="Socio-Economic">
                  <Row label="Educ. Attainment"  value={resident.educational_attainment} />
                  <Row label="Employment Status" value={resident.employment_status} />
                  <Row label="Occupation"        value={resident.occupation} />
                  <Row label="Income Bracket"    value={resident.income_bracket} />
                  <Row label="Sector"            value={resident.sector ?? "N/A"} />
                </Section>

                {/* 2. Contact Details */}
                <Section title="Contact Details">
                  <Row label="Email"    value={resident.email} />
                  <Row label="Mobile"   value={resident.mobile} />
                  <Row label="Tel. No"  value={resident.tel_no} />
                </Section>

                {/* 3. Address */}
                <Section title="Address">
                  <Row label="Full Address"          value={fullAddress(resident)} />
                  <Row label="House/Block/Lot No."   value={resident.house_block_lot_no} />
                  <Row label="Street"                value={resident.street} />
                  <Row label="Subdivision/Village"   value={resident.subdivision_village} />
                  <Row label="Sitio/Purok"           value={resident.purok?.name} />
                  <Row label="Barangay"              value={resident.barangay} />
                  <Row label="City/Municipality"     value={resident.city_municipality} />
                  <Row label="Province"              value={resident.province} />
                  <Row label="Region"                value={resident.region} />
                  <Row label="ZIP Code"              value={resident.zip_code} />
                </Section>

                {/* 4. Identity Information */}
                <Section title="Identity Information">
                  <Row label="Ethnicity"    value={resident.ethnicity} />
                  <Row label="Blood Type"   value={resident.blood_type} />
                  <Row label="Height (m)"   value={resident.height_m != null ? String(resident.height_m) : null} />
                  <Row label="Weight (kg)"  value={resident.weight_kg != null ? String(resident.weight_kg) : null} />
                  <Row label="Complexion"   value={resident.complexion} />
                </Section>

                {/* 5. Voter Information */}
                <Section title="Voter Information">
                  <Row label="Registered Voter" value={resident.is_registered_voter ? "Yes" : "No"} />
                  <Row label="Resident Voter"   value={resident.is_resident_voter ? "Yes" : "No"} />
                  <Row label="Last Voted Year"  value={resident.last_voted_year} />
                </Section>

                {/* 6. Beneficiary Info */}
                <Section
                  title={`Beneficiary Info (${resident.government_assistance.length})`}
                  action={
                    assistanceFormOpen === null && (
                      <button
                        onClick={openAddAssistance}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#3B82F6] hover:text-[#2563EB]"
                      >
                        <Plus size={12} /> Add Program
                      </button>
                    )
                  }
                >
                  {assistanceFormOpen !== null && (
                    <div className="mb-3 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] p-3 space-y-2">
                      <input
                        value={assistanceForm.program_name}
                        onChange={(e) => setAssistanceForm((f) => ({ ...f, program_name: e.target.value }))}
                        placeholder="Program name (e.g. 4Ps)"
                        className="w-full rounded-md border border-[#E9EAEC] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3B82F6]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={assistanceForm.date_enrolled}
                          onChange={(e) => setAssistanceForm((f) => ({ ...f, date_enrolled: e.target.value }))}
                          className="w-full rounded-md border border-[#E9EAEC] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3B82F6]"
                        />
                        <input
                          value={assistanceForm.notes}
                          onChange={(e) => setAssistanceForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="Notes (optional)"
                          className="w-full rounded-md border border-[#E9EAEC] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAssistanceFormOpen(null)} className="text-[11px] font-bold text-[#6B7280] hover:text-[#1F2937]">
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveAssistance}
                          disabled={assistanceBusy || !assistanceForm.program_name.trim()}
                          className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#2563EB] disabled:opacity-50"
                        >
                          {assistanceBusy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}

                  {resident.government_assistance.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No assistance programs on file</p>
                  ) : (
                    <div className="space-y-2">
                      {resident.government_assistance.map((a) => (
                        <div key={a.id} className="flex items-start justify-between gap-2 py-1 border-b border-[#F4F5F7] last:border-0">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[#1F2937]">{a.program_name}</p>
                            <p className="text-[10px] text-[#9CA3AF]">
                              Enrolled {formatDate(a.date_enrolled)}{a.notes ? ` · ${a.notes}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => openEditAssistance(a)} className="flex h-6 w-6 items-center justify-center rounded text-[#9CA3AF] hover:bg-[#F4F5F7] hover:text-[#1F2937]">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => setAssistanceDeleteTarget(a)} className="flex h-6 w-6 items-center justify-center rounded text-[#9CA3AF] hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 7. Sectoral Affiliations */}
                <Section
                  title="Sectoral Affiliations"
                  action={
                    !addingSector && availableSectorTypes.length > 0 && (
                      <button
                        onClick={() => setAddingSector(true)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#3B82F6] hover:text-[#2563EB]"
                      >
                        <Plus size={12} /> Add Tag
                      </button>
                    )
                  }
                >
                  {addingSector && (
                    <div className="mb-3 flex items-center gap-2">
                      <select
                        value={newSector}
                        onChange={(e) => setNewSector(e.target.value)}
                        className="flex-1 rounded-md border border-[#E9EAEC] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3B82F6]"
                      >
                        <option value="">Select sector...</option>
                        {availableSectorTypes.map((t) => (
                          <option key={t} value={t}>{SECTOR_TYPE_LABEL[t]}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddSector}
                        disabled={!newSector || sectorBusy}
                        className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#2563EB] disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button onClick={() => { setAddingSector(false); setNewSector(""); }} className="text-[#9CA3AF] hover:text-[#374151]">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {resident.sectors.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No sectoral affiliations tagged</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {resident.sectors.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
                        >
                          {SECTOR_TYPE_LABEL[s.sector_type] ?? s.sector_type}
                          <button onClick={() => handleRemoveSector(s.id)} disabled={sectorBusy} className="hover:text-blue-900">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Special Registries */}
                <Section title="Special Registries">
                  {resident.special_registries.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">Not in any special registry</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {resident.special_registries.map(sr => (
                        <div key={sr.id}>
                          <Badge
                            label={sr.registry_type === "FOUR_PS" ? "4Ps" : sr.registry_type.replace("_", " ")}
                            color={sr.registry_type === "SENIOR_CITIZEN" ? "amber" : sr.registry_type === "PWD" ? "blue" : "green"}
                          />
                          {sr.disability_type && (
                            <span className="text-[10px] text-[#6B7280] ml-1">({sr.disability_type})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 8. Household */}
                <Section title="Household">
                  <Row label="Current Purok"     value={resident.purok?.name} />
                  <Row label="Household No."     value={resident.household?.household_no} />
                  <Row label="House Address"     value={resident.household?.address} />
                  <Row label="Housing Type"      value={resident.household?.housing_type} />
                  <Row label="Water Source"      value={resident.household?.water_source} />
                  <Row label="Comfort Room"      value={resident.household?.comfort_room} />
                  {resident.household && (
                    <div className="mt-2">
                      <button
                        onClick={() => router.push(`/households/${resident.household!.id}`)}
                        className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] uppercase tracking-wide"
                      >
                        View All Household Members ({resident.household.members?.length ?? 0})
                      </button>
                    </div>
                  )}
                </Section>

                {/* 9. Document Requests */}
                <Section title={`Document Requests (${resident.certificates.length})`}>
                  {resident.certificates.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No certificates issued yet</p>
                  ) : (
                    <div className="space-y-2">
                      {resident.certificates.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                          <div>
                            <p className="text-[12px] font-semibold text-[#1F2937]">
                              {c.certificate_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-[#9CA3AF]">{c.purpose}</p>
                          </div>
                          <span className="text-[10px] text-[#6B7280] shrink-0 ml-2">
                            {c.issued_at ? new Date(c.issued_at).toLocaleDateString() : (c.status ?? "Pending")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 10. Blotter Records */}
                <Section title={`Blotter Records (${blotterRecords.length})`}>
                  {blotterRecords.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No blotter records</p>
                  ) : (
                    <div className="space-y-2">
                      {blotterRecords.slice(0, 5).map((b) => (
                        <div key={`${b.role}-${b.id}`} className="py-1 border-b border-[#F4F5F7] last:border-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-semibold text-[#1F2937]">{b.case_number}</p>
                            <Badge label={b.role} color={b.role === "Complainant" ? "blue" : "amber"} />
                          </div>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {b.incident_type} · {new Date(b.incident_date).toLocaleDateString()} · {b.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Vaccinations */}
                <Section title={`Vaccinations (${resident.vaccinations.length})`}>
                  {resident.vaccinations.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No vaccination records</p>
                  ) : (
                    <div className="space-y-2">
                      {resident.vaccinations.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                          <p className="text-[12px] font-semibold text-[#1F2937]">{v.vaccine_name}</p>
                          <span className="text-[10px] text-[#6B7280]">
                            {new Date(v.date_given).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Health Records */}
                <Section title={`Health Records (${resident.health_records.length})`}>
                  {resident.health_records.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No health records</p>
                  ) : (
                    <div className="space-y-2">
                      {resident.health_records.slice(0, 5).map(hr => (
                        <div key={hr.id} className="py-1 border-b border-[#F4F5F7] last:border-0">
                          <div className="flex justify-between">
                            <p className="text-[12px] font-semibold text-[#1F2937]">{hr.record_type}</p>
                            <span className="text-[10px] text-[#6B7280]">
                              {new Date(hr.recorded_at).toLocaleDateString()}
                            </span>
                          </div>
                          {hr.notes && <p className="text-[11px] text-[#6B7280] mt-0.5">{hr.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Barangay IDs */}
                <Section title={`Barangay IDs (${resident.barangay_ids.length})`}>
                  {resident.barangay_ids.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No barangay ID issued</p>
                  ) : (
                    <div className="space-y-2">
                      {resident.barangay_ids.map(bid => (
                        <div key={bid.id} className="flex justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                          <p className="text-[12px] font-semibold text-[#1F2937]">{bid.id_number}</p>
                          <span className="text-[10px] text-[#6B7280]">
                            {new Date(bid.issued_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 11. Activity History */}
                <Section title="Activity History">
                  {resident.activity_history.length === 0 ? (
                    <p className="text-[12px] text-[#9CA3AF]">No recorded activity yet</p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {resident.activity_history.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 py-1 border-b border-[#F4F5F7] last:border-0">
                          <Badge label={a.action} color={ACTION_COLOR[a.action] ?? "blue"} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-[#374151]">{a.details ?? `${a.action} on ${a.table_affected}`}</p>
                            <p className="text-[10px] text-[#9CA3AF]">
                              {formatDateTime(a.performed_at)}{a.user ? ` · ${a.user.username}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

              </div>

              {/* Footer meta */}
              <div className="mt-4 flex justify-end gap-4">
                <span className="text-[10px] text-[#9CA3AF]">
                  Registered: {new Date(resident.created_at).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-[#9CA3AF]">
                  Last updated: {new Date(resident.updated_at).toLocaleDateString()}
                </span>
              </div>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={confirmOpen}
      title="Archive Resident"
      message="This resident will be hidden from the main list. You can restore them later from the admin panel."
      confirmLabel="Yes, Archive"
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