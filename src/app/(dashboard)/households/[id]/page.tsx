// FILE: src/app/(dashboard)/households/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  MapPin,
  Droplets,
  DoorOpen,
  Crown,
  Users,
  Search,
  Plus,
  Trash2,
  Pencil,
  Printer,
  ClipboardList,
  Zap,
  Trash,
  Wallet,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  memberFullName,
  calcAge,
  formatISODate,
  formatCurrency,
} from "@/lib/mock/households";
import type { HouseholdMock, HouseholdMemberMock, MigrantMock } from "@/lib/mock/households";

const HOUSING_LABEL: Record<string, string> = { OWN: "Own", RENT: "Rent", SHARED: "Shared", INFORMAL: "Informal" };
const WATER_LABEL: Record<string, string> = { INDIVIDUAL: "Individual", COMMUNAL: "Communal", WELL: "Well", OTHER: "Other" };
const CR_LABEL: Record<string, string> = { OWN: "Own", SHARED: "Shared", NONE: "None" };
const TENURE_LABEL: Record<string, string> = {
  OWNER: "Owner", RENTER: "Renter", CARETAKER: "Caretaker", SHARER: "Sharer", OTHER: "Other",
};
const HOUSEHOLD_UNIT_LABEL: Record<string, string> = {
  SINGLE_HOUSE: "Single House", DUPLEX: "Duplex", APARTMENT: "Apartment", OTHER: "Other",
};
const WASTE_LABEL: Record<string, string> = {
  COLLECTED: "Collected", BURNED: "Burned", BURIED: "Buried", COMPOSTED: "Composted", OTHER: "Other",
};
const POWER_LABEL: Record<string, string> = {
  ELECTRIC_METERED: "Electric (Metered)", ELECTRIC_SHARED: "Electric (Shared)", SOLAR: "Solar", NONE: "None", OTHER: "Other",
};

// Renders "Owner" normally, or "Other — Boarding house" when the value is
// OTHER and a free-text companion field was filled in.
function withOther(value: string | null, other: string | null, labels: Record<string, string>) {
  if (!value) return "—";
  const label = labels[value] ?? value;
  if (value === "OTHER" && other) return `Other — ${other}`;
  return label;
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7] dark:bg-[#262626]">
        <Icon size={14} className="text-[#6B7280] dark:text-[#A3A3A3]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{label}</p>
        <p className="truncate text-[13px] font-medium text-[#1F2937] dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );
}

interface MigrantFormState {
  name: string;
  previous_location: string;
  reason: string;
  transferred_to: string;
  duration_here: string;
  has_returned: boolean;
}

const EMPTY_MIGRANT_FORM: MigrantFormState = {
  name: "", previous_location: "", reason: "", transferred_to: "", duration_here: "", has_returned: false,
};

// ─── MAIN PAGE (keyed by id so state resets cleanly on navigation) ───────────
export default function HouseholdDetailPage() {
  const params = useParams();
  const householdId = Number(params.id);
  return <HouseholdDetailContent key={householdId} householdId={householdId} />;
}

function HouseholdDetailContent({ householdId }: { householdId: number }) {
  const router = useRouter();

  const [household, setHousehold] = useState<HouseholdMock | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateResidents, setCandidateResidents] = useState<HouseholdMemberMock[]>([]);

  // Initial load: inlined directly in the effect (not delegated to a named
  // function) — react-hooks/set-state-in-effect's static analysis flags any
  // function call in an effect body that transitively calls setState, even
  // an async one where the actual setState happens after an await. Inlining
  // the .then/.catch/.finally chain here is what satisfies it.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/households/${householdId}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data: HouseholdMock) => { if (!cancelled) setHousehold(data); })
      .catch(e => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [householdId]);

  // Reusable refetch for after mutations — only called from event handlers,
  // never from an effect, so react-hooks/set-state-in-effect doesn't apply.
  const loadHousehold = useCallback(async () => {
    try {
      const res = await fetch(`/api/households/${householdId}`);
      if (!res.ok) throw new Error("Not found");
      setHousehold(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [householdId]);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState<HouseholdMemberMock | null>(null);
  const [deleteHouseholdConfirm, setDeleteHouseholdConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // ── Migrants (2.8) ──
  const [migrantFormOpen, setMigrantFormOpen] = useState<"new" | number | null>(null);
  const [migrantForm, setMigrantForm] = useState<MigrantFormState>(EMPTY_MIGRANT_FORM);
  const [migrantDeleteTarget, setMigrantDeleteTarget] = useState<MigrantMock | null>(null);
  const [migrantBusy, setMigrantBusy] = useState(false);

  // Search for unassigned residents as the user types (debounced).
  useEffect(() => {
    if (!memberQuery.trim()) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(`/api/residents?unassigned=true&search=${encodeURIComponent(memberQuery)}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => { if (!cancelled) setCandidateResidents(data.residents ?? []); })
        .catch(() => { if (!cancelled) setCandidateResidents([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [memberQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
      </div>
    );
  }

  if (!household) {
    return (
      <EmptyState
        icon={Home}
        title="Household not found"
        description="This household doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/households")}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            Back to Households
          </button>
        }
      />
    );
  }

  async function handleAddMember(resident: HouseholdMemberMock) {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/residents/${resident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: household!.id }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      await loadHousehold();
      setShowAddMember(false);
      setMemberQuery("");
    } catch (e: any) {
      setActionError(e.message || "Failed to add member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget || !household) return;
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/residents/${removeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: null }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      await loadHousehold();
      setRemoveTarget(null);
    } catch (e: any) {
      setActionError(e.message || "Failed to remove member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetHead(member: HouseholdMemberMock) {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/households/${household!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_head_id: member.id }),
      });
      if (!res.ok) throw new Error("Failed to set household head");
      await loadHousehold();
    } catch (e: any) {
      setActionError(e.message || "Failed to set household head.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteHousehold() {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/households/${household!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete household");
      router.push("/households");
    } catch (e: any) {
      setActionError(e.message || "Failed to delete household.");
      setBusy(false);
      setDeleteHouseholdConfirm(false);
    }
  }

  // ── Migrants (2.8) ──
  function openAddMigrant() {
    setMigrantForm(EMPTY_MIGRANT_FORM);
    setMigrantFormOpen("new");
  }

  function openEditMigrant(m: MigrantMock) {
    setMigrantForm({
      name: m.name,
      previous_location: m.previous_location ?? "",
      reason: m.reason ?? "",
      transferred_to: m.transferred_to ?? "",
      duration_here: m.duration_here ?? "",
      has_returned: m.has_returned,
    });
    setMigrantFormOpen(m.id);
  }

  async function handleSaveMigrant() {
    if (!migrantForm.name.trim() || !household) return;
    setMigrantBusy(true);
    setActionError("");
    try {
      const payload = {
        household_id: household.id,
        name: migrantForm.name.trim(),
        previous_location: migrantForm.previous_location.trim() || null,
        reason: migrantForm.reason.trim() || null,
        transferred_to: migrantForm.transferred_to.trim() || null,
        duration_here: migrantForm.duration_here.trim() || null,
        has_returned: migrantForm.has_returned,
      };

      const res =
        migrantFormOpen === "new"
          ? await fetch("/api/migrants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/migrants/${migrantFormOpen}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (!res.ok) throw new Error("Failed to save migrant record");
      await loadHousehold();
      setMigrantFormOpen(null);
    } catch (e: any) {
      setActionError(e.message || "Failed to save migrant record.");
    } finally {
      setMigrantBusy(false);
    }
  }

  async function handleDeleteMigrant() {
    if (!migrantDeleteTarget) return;
    setMigrantBusy(true);
    try {
      const res = await fetch(`/api/migrants/${migrantDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete migrant record");
      await loadHousehold();
      setMigrantDeleteTarget(null);
    } catch (e: any) {
      setActionError(e.message || "Failed to delete migrant record.");
    } finally {
      setMigrantBusy(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/households")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Households
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">{household.household_no}</h1>
            <span className="inline-flex items-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
              {household.purok.name}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">{household.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] print:hidden"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={() => router.push(`/households/${household.id}/edit`)}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{actionError}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left: household info ── */}
        <div className="space-y-5 lg:col-span-1">
          {/* Household Information */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
              Household Information
            </p>
            <div className="space-y-4">
              <InfoTile icon={MapPin} label="Address" value={household.address} />
            </div>
            <div className="mt-4 border-t border-[#F4F5F7] dark:border-[#262626] pt-3 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
              Registered {formatISODate(household.created_at)}
              {household.updated_at !== household.created_at && (
                <> &middot; Updated {formatISODate(household.updated_at)}</>
              )}
            </div>
          </div>

          {/* Classification */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Classification</p>
            <div className="space-y-4">
              <InfoTile icon={Home} label="Housing Type" value={withOther(household.housing_type, household.housing_type_other, HOUSING_LABEL)} />
              <InfoTile icon={ClipboardList} label="Tenure Status" value={withOther(household.tenure_status, household.tenure_other, TENURE_LABEL)} />
              <InfoTile icon={Home} label="Household Unit" value={withOther(household.household_unit, household.household_unit_other, HOUSEHOLD_UNIT_LABEL)} />
            </div>
          </div>

          {/* National Indicators (DILG/BIMS) */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
              National Indicators (DILG/BIMS)
            </p>
            <div className="space-y-4">
              <InfoTile icon={Droplets} label="Water System" value={WATER_LABEL[household.water_source ?? ""] ?? "—"} />
              <InfoTile icon={Trash} label="Waste Disposal" value={WASTE_LABEL[household.waste_disposal ?? ""] ?? "—"} />
              <InfoTile icon={Zap} label="Power Supply" value={POWER_LABEL[household.power_supply ?? ""] ?? "—"} />
              <InfoTile icon={DoorOpen} label="Toilet Type" value={CR_LABEL[household.comfort_room ?? ""] ?? "—"} />
            </div>
          </div>

          {/* Demographics */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <p className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Demographics</p>
            <div className="space-y-4">
              <InfoTile icon={Users} label="No. of Members" value={String(household.members.length)} />
              <InfoTile icon={UsersRound} label="No. of Families" value={household.no_of_families != null ? String(household.no_of_families) : "—"} />
              <InfoTile icon={Wallet} label="Monthly Income" value={household.monthly_income != null ? formatCurrency(household.monthly_income) : "—"} />
            </div>
          </div>

          {/* Household head */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Crown size={14} className="text-[#D97706] dark:text-[#FBBF24]" />
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Household Head</p>
            </div>
            {household.household_head ? (
              <div>
                <p className="text-[14px] font-bold text-[#1F2937] dark:text-white">{memberFullName(household.household_head)}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                  {household.household_head.sex} &middot; {calcAge(household.household_head.birthdate)} yrs old
                  &middot; {household.household_head.occupation ?? "N/A"}
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                No household head assigned. Set one from the members list on the right.
              </p>
            )}
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-[#FEE2E2] dark:border-red-500/20 bg-white dark:bg-[#171717] p-5">
            <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#DC2626] dark:text-[#F87171]">Danger Zone</p>
            <p className="mb-3 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
              Deleting a household does not delete its members&apos; resident records, but unlinks them.
            </p>
            <button
              onClick={() => setDeleteHouseholdConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-[#FEE2E2] dark:border-red-500/20 px-4 py-2 text-[12px] font-bold text-[#DC2626] dark:text-[#F87171] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20"
            >
              <Trash2 size={13} />
              Delete Household
            </button>
          </div>
        </div>

        {/* ── Right: members + migrants ── */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
                Household Members ({household.members.length})
              </p>
              <button
                onClick={() => setShowAddMember((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
              >
                <Plus size={13} />
                Add Member
              </button>
            </div>

            {showAddMember && (
              <div className="relative mb-4">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search unassigned residents by name..."
                  autoFocus
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                />
                {memberQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] shadow-lg">
                    {candidateResidents.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No matching residents found</p>
                    ) : (
                      candidateResidents.map((r: HouseholdMemberMock) => (
                        <button
                          key={r.id}
                          disabled={busy}
                          onClick={() => handleAddMember(r)}
                          className="flex w-full items-center justify-between border-b border-[#F4F5F7] dark:border-[#262626] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F] disabled:opacity-50"
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white">{memberFullName(r)}</p>
                            <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                              {r.sex} &middot; {calcAge(r.birthdate)} yrs old
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#3B82F6] dark:text-[#60A5FA]">Add</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {household.members.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                No members yet. Use &quot;Add Member&quot; to attach existing residents to this household.
              </p>
            ) : (
              <div className="space-y-2">
                {household.members.map((m: HouseholdMemberMock) => {
                  const isHead = household.household_head_id === m.id;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-bold text-[#1F2937] dark:text-white">{memberFullName(m)}</p>
                          {isHead && (
                            <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-[#D97706] dark:text-[#FBBF24]">
                              <Crown size={10} />
                              Head
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                          {m.sex} &middot; {calcAge(m.birthdate)} yrs old &middot; {m.civil_status} &middot;{" "}
                          {m.occupation ?? "N/A"}
                        </p>
                      </div>
                      {!isHead && (
                        <button
                          onClick={() => handleSetHead(m)}
                          disabled={busy}
                          className="shrink-0 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-1.5 text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-50"
                        >
                          Set as Head
                        </button>
                      )}
                      <button
                        onClick={() => setRemoveTarget(m)}
                        disabled={busy}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20 hover:text-[#DC2626] dark:hover:text-[#F87171] disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Migrants (2.8) */}
          <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
                Migrants ({household.migrants.length})
              </p>
              {migrantFormOpen === null && (
                <button
                  onClick={openAddMigrant}
                  className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
                >
                  <Plus size={13} />
                  Add Migrant
                </button>
              )}
            </div>

            {migrantFormOpen !== null && (
              <div className="mb-4 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">
                    {migrantFormOpen === "new" ? "New Migrant" : "Edit Migrant"}
                  </p>
                  <button onClick={() => setMigrantFormOpen(null)}>
                    <X size={14} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Name <span className="text-[#DC2626] dark:text-[#F87171]">*</span>
                    </label>
                    <input
                      value={migrantForm.name}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Previous Location
                    </label>
                    <input
                      value={migrantForm.previous_location}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, previous_location: e.target.value }))}
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Reason
                    </label>
                    <input
                      value={migrantForm.reason}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, reason: e.target.value }))}
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Transferred To
                    </label>
                    <input
                      value={migrantForm.transferred_to}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, transferred_to: e.target.value }))}
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Duration Here
                    </label>
                    <input
                      value={migrantForm.duration_here}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, duration_here: e.target.value }))}
                      placeholder="e.g. 2 years"
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>
                  <label className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={migrantForm.has_returned}
                      onChange={(e) => setMigrantForm((f) => ({ ...f, has_returned: e.target.checked }))}
                      className="h-4 w-4 rounded border-[#E9EAEC] dark:border-[#262626] text-[#3B82F6] dark:text-[#60A5FA]"
                    />
                    <span className="text-[12px] text-[#374151] dark:text-[#D4D4D4]">Has returned to previous location</span>
                  </label>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setMigrantFormOpen(null)}
                    className="rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[11px] font-bold text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMigrant}
                    disabled={migrantBusy || !migrantForm.name.trim()}
                    className="rounded-lg bg-[#3B82F6] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
                  >
                    {migrantBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {household.migrants.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                No migrant records for this household.
              </p>
            ) : (
              <div className="space-y-2">
                {household.migrants.map((m) => (
                  <div key={m.id} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-bold text-[#1F2937] dark:text-white">{m.name}</p>
                          {!m.has_returned && (
                            <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-[#D97706] dark:text-[#FBBF24]">
                              No return
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                          From {m.previous_location || "—"} &middot; {m.reason || "No reason on file"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                          Transferred to {m.transferred_to || "—"} &middot; {m.duration_here || "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEditMigrant(m)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setMigrantDeleteTarget(m)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20 hover:text-[#DC2626] dark:hover:text-[#F87171]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member from household?"
        message={
          removeTarget
            ? `${memberFullName(removeTarget)} will be unlinked from this household. Their resident record is kept.`
            : ""
        }
        confirmLabel={busy ? "Removing..." : "Remove"}
        cancelLabel="Cancel"
        variant="danger"
        loading={busy}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={deleteHouseholdConfirm}
        title="Delete this household?"
        message={`${household.household_no} will be permanently deleted. This cannot be undone.`}
        confirmLabel={busy ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        loading={busy}
        onConfirm={handleDeleteHousehold}
        onCancel={() => setDeleteHouseholdConfirm(false)}
      />

      <ConfirmDialog
        open={!!migrantDeleteTarget}
        title="Delete migrant record?"
        message={migrantDeleteTarget ? `The record for "${migrantDeleteTarget.name}" will be permanently deleted.` : ""}
        confirmLabel={migrantBusy ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        loading={migrantBusy}
        onConfirm={handleDeleteMigrant}
        onCancel={() => setMigrantDeleteTarget(null)}
      />
    </div>
  );
}