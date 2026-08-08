// src/components/registries/RegistryDetailSheet.tsx
//
// The registry entry detail view, as a slide-over instead of a full page
// navigation — same content as (dashboard)/registries/*/[id]/page.tsx
// (which still exists for direct links/bookmarks), just re-homed so it can
// render inside <Sheet> and be driven by an `entryId` prop from the list
// page. Mirrors the pattern set by BlotterCaseSheet.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Home, Heart, Syringe, FileText, CreditCard, BookOpen,
  CalendarDays, Trash2, ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RegistryType = "SENIOR_CITIZEN" | "PWD" | "FOUR_PS";

interface RegistryResident {
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

interface RegistryEntry {
  id: number;
  resident_id: number;
  registry_type: RegistryType;
  disability_type: string | null;
  is_4ps_beneficiary: boolean;
  registered_at: string;
  resident: RegistryResident;
}

interface RegistryDetailSheetProps {
  /** The registry entry to show, or null to keep the sheet closed. */
  entryId: number | null;
  title: string;
  icon: LucideIcon;
  iconBg: string;
  /** e.g. "/registries/senior-citizens" — used for the "open full page" link. */
  listBase: string;
  onClose: () => void;
  /** Called after a successful removal, so the list page can refetch. */
  onRemoved?: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function rbiId(id: number) {
  return `BM${String(id).padStart(7, "0")}`;
}

const REGISTRY_CFG: Record<RegistryType, { label: string; bg: string; border: string; text: string }> = {
  SENIOR_CITIZEN: { label: "Senior Citizen", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" },
  PWD: { label: "PWD", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
  FOUR_PS: { label: "4Ps Beneficiary", bg: "bg-green-50", border: "border-green-100", text: "text-green-700" },
};

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1.25">
      <span className="min-w-30 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </span>
      <span className="text-[11px] font-medium text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

function SectionCard({
  title, icon: Icon, iconBg, children,
}: { title: string; icon: LucideIcon; iconBg: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
      <div className="flex items-center gap-2.5 border-b border-[#E9EAEC] px-4 py-2.5">
        <div className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon size={12} className="text-white" />
        </div>
        <p className="text-[10.5px] font-black uppercase tracking-widest text-[#1F2937]">{title}</p>
      </div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RegistryDetailSheet({
  entryId, title, icon: Icon, iconBg, listBase, onClose, onRemoved,
}: RegistryDetailSheetProps) {
  const router = useRouter();
  const open = entryId !== null;

  const [entry, setEntry] = useState<RegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Reset stale content synchronously when switching between entries while
  // the sheet stays mounted (same pattern as BlotterCaseSheet).
  const [syncedEntryId, setSyncedEntryId] = useState<number | null>(null);
  if (entryId !== null && entryId !== syncedEntryId) {
    setSyncedEntryId(entryId);
    setEntry(null);
    setLoading(true);
  } else if (entryId === null && syncedEntryId !== null) {
    setSyncedEntryId(null);
  }

  useEffect(() => {
    if (entryId === null) return;
    let cancelled = false;

    fetch(`/api/registries/${entryId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (!cancelled) setEntry(data); })
      .catch(() => { if (!cancelled) setEntry(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [entryId]);

  async function handleDelete() {
    if (!entry) return;
    if (!confirm("Remove this resident from the registry? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/registries/${entry.id}`, { method: "DELETE" });
      onRemoved?.();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const r = entry?.resident;
  const cfg = entry ? REGISTRY_CFG[entry.registry_type] : null;
  const displayName = r
    ? `${r.lname}, ${r.fname}${r.name_extension ? " " + r.name_extension : ""}${r.mname ? " " + r.mname[0] + "." : ""}`
    : "";

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent widthClassName="max-w-4xl" className="p-0">
        {loading || !entry || !r || !cfg ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Entry not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Entry not found"
                  description="This registry entry doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle>{displayName}</SheetTitle>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                    {rbiId(r.id)} · {title} Registry
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`${listBase}/${entry.id}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {/* Top banner */}
              <div className={`grid grid-cols-2 gap-4 rounded-xl border px-5 py-4 sm:grid-cols-4 ${cfg.bg} ${cfg.border}`}>
                <div>
                  <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Registry Type</p>
                  <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>{cfg.label}</p>
                </div>
                <div>
                  <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Registered On</p>
                  <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>{fmtDate(entry.registered_at)}</p>
                </div>
                <div>
                  <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Age</p>
                  <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>{calcAge(r.birthdate)} years old</p>
                </div>
                {entry.registry_type === "PWD" && (
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Disability Type</p>
                    <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>{entry.disability_type ?? "—"}</p>
                  </div>
                )}
                {entry.registry_type === "FOUR_PS" && (
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>4Ps Status</p>
                    <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>
                      {entry.is_4ps_beneficiary ? "Active Beneficiary" : "Inactive"}
                    </p>
                  </div>
                )}
                {entry.registry_type === "SENIOR_CITIZEN" && (
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Date of Birth</p>
                    <p className={`mt-0.5 text-[13px] font-bold ${cfg.text}`}>{fmtDate(r.birthdate)}</p>
                  </div>
                )}
              </div>

              {/* 2-column card grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Column 1 */}
                <div className="space-y-4">
                  <SectionCard title="Personal Information" icon={User} iconBg="bg-[#3B82F6]">
                    <InfoRow label="RBI ID" value={rbiId(r.id)} />
                    <InfoRow label="Date of Birth" value={fmtDate(r.birthdate)} />
                    <InfoRow label="Place of Birth" value={r.place_of_birth} />
                    <InfoRow label="Sex" value={r.sex} />
                    <InfoRow label="Civil Status" value={r.civil_status.replace("_", "-")} />
                    <InfoRow label="Citizenship" value={r.citizenship} />
                    <InfoRow label="Religion" value={r.religion} />
                  </SectionCard>

                  <SectionCard title="Socio-Economic" icon={BookOpen} iconBg="bg-purple-500">
                    <InfoRow label="Employment" value={r.employment_status} />
                    <InfoRow label="Education" value={r.educational_attainment} />
                    <InfoRow label="Occupation" value={r.occupation} />
                    <InfoRow label="Income" value={r.income_bracket} />
                    <InfoRow label="Sector" value={r.sector ?? "N/A"} />
                  </SectionCard>

                  <SectionCard title="Registry Info" icon={CalendarDays} iconBg="bg-teal-500">
                    <InfoRow label="Registry Type" value={cfg.label} />
                    <InfoRow label="Registered On" value={fmtDate(entry.registered_at)} />
                    {entry.disability_type && <InfoRow label="Disability" value={entry.disability_type} />}
                    {entry.registry_type === "FOUR_PS" && (
                      <InfoRow label="4Ps Status" value={entry.is_4ps_beneficiary ? "Active" : "Inactive"} />
                    )}
                  </SectionCard>
                </div>

                {/* Column 2 */}
                <div className="space-y-4">
                  <SectionCard title="Address & Household" icon={Home} iconBg="bg-amber-500">
                    <InfoRow label="Purok" value={r.purok?.name} />
                    <InfoRow label="Household No." value={r.household?.household_no} />
                    <InfoRow label="Address" value={r.household?.address} />
                    <InfoRow label="Housing Type" value={r.household?.housing_type} />
                    <InfoRow label="Water Source" value={r.household?.water_source} />
                    <InfoRow label="CR" value={r.household?.comfort_room} />
                    <InfoRow label="No. of Members" value={r.household?._count?.members ?? "—"} />
                    {r.household && (
                      <button
                        onClick={() => router.push(`/households/${r.household!.id}`)}
                        className="mt-1 text-[11px] font-bold text-[#3B82F6] transition hover:text-[#1D4ED8]"
                      >
                        View Household Members →
                      </button>
                    )}
                  </SectionCard>

                  <SectionCard title={`Certificates (${r.certificates.length})`} icon={FileText} iconBg="bg-green-500">
                    {r.certificates.length === 0 ? (
                      <p className="py-1 text-[11px] text-[#9CA3AF]">No certificates issued yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {r.certificates.slice(0, 4).map((c) => (
                          <div key={c.id} className="flex items-center justify-between border-b border-[#F4F5F7] py-1 last:border-0">
                            <p className="truncate pr-2 text-[11px] font-semibold text-[#1F2937]">
                              {c.certificate_type.replace(/_/g, " ")}
                            </p>
                            <span className="shrink-0 text-[10px] text-[#9CA3AF]">{fmtShort(c.issued_at)}</span>
                          </div>
                        ))}
                        {r.certificates.length > 4 && (
                          <p className="pt-1 text-[10px] text-[#3B82F6]">+{r.certificates.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title={`Barangay IDs (${r.barangay_ids.length})`} icon={CreditCard} iconBg="bg-[#1F2937]">
                    {r.barangay_ids.length === 0 ? (
                      <p className="py-1 text-[11px] text-[#9CA3AF]">No barangay ID issued</p>
                    ) : (
                      r.barangay_ids.map((bid) => (
                        <div key={bid.id} className="flex justify-between border-b border-[#F4F5F7] py-1.5 last:border-0">
                          <p className="text-[12px] font-bold text-[#1F2937]">{bid.id_number}</p>
                          <span className="text-[10px] text-[#9CA3AF]">{fmtShort(bid.issued_date)}</span>
                        </div>
                      ))
                    )}
                  </SectionCard>

                  <SectionCard title={`Health Records (${r.health_records.length})`} icon={Heart} iconBg="bg-red-500">
                    {r.health_records.length === 0 ? (
                      <p className="py-1 text-[11px] text-[#9CA3AF]">No health records</p>
                    ) : (
                      <div className="space-y-1.5">
                        {r.health_records.slice(0, 5).map((hr) => (
                          <div key={hr.id} className="border-b border-[#F4F5F7] py-1 last:border-0">
                            <div className="flex justify-between">
                              <p className="text-[11px] font-semibold text-[#1F2937]">{hr.record_type}</p>
                              <span className="text-[10px] text-[#9CA3AF]">{fmtShort(hr.recorded_at)}</span>
                            </div>
                            {hr.notes && <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">{hr.notes}</p>}
                          </div>
                        ))}
                        {r.health_records.length > 5 && (
                          <p className="pt-1 text-[10px] text-[#3B82F6]">+{r.health_records.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title={`Vaccinations (${r.vaccinations.length})`} icon={Syringe} iconBg="bg-[#3B82F6]">
                    {r.vaccinations.length === 0 ? (
                      <p className="py-1 text-[11px] text-[#9CA3AF]">No vaccination records</p>
                    ) : (
                      <div className="space-y-1.5">
                        {r.vaccinations.slice(0, 5).map((v) => (
                          <div key={v.id} className="flex justify-between border-b border-[#F4F5F7] py-1 last:border-0">
                            <p className="truncate pr-2 text-[11px] font-semibold text-[#1F2937]">{v.vaccine_name}</p>
                            <span className="shrink-0 text-[10px] text-[#9CA3AF]">{fmtShort(v.date_given)}</span>
                          </div>
                        ))}
                        {r.vaccinations.length > 5 && (
                          <p className="pt-1 text-[10px] text-[#3B82F6]">+{r.vaccinations.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </SectionCard>
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-[12px] font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} /> Remove
              </button>
              <button
                onClick={() => router.push(`/residents/${r.id}`)}
                className="flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-5 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
              >
                <User size={13} /> View Full RBI Profile
              </button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}