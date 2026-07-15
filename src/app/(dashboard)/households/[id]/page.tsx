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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  memberFullName,
  calcAge,
  formatISODate,
} from "@/lib/mock/households";
import type { HouseholdMock, HouseholdMemberMock } from "@/lib/mock/households";

const HOUSING_LABEL: Record<string, string> = { OWN: "Own", RENT: "Rent", SHARED: "Shared", INFORMAL: "Informal" };
const WATER_LABEL: Record<string, string> = { INDIVIDUAL: "Individual", COMMUNAL: "Communal", WELL: "Well", OTHER: "Other" };
const CR_LABEL: Record<string, string> = { OWN: "Own", SHARED: "Shared", NONE: "None" };

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7]">
        <Icon size={14} className="text-[#6B7280]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <p className="truncate text-[13px] font-medium text-[#1F2937]">{value || "—"}</p>
      </div>
    </div>
  );
}

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

  // Reusable refetch for after mutations — only called from event handlers
  // (handleAddMember, handleRemoveMember, etc.), never from an effect, so
  // react-hooks/set-state-in-effect doesn't apply to it.
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

  // Search for unassigned residents as the user types (debounced).
  // When the query is empty, we simply don't fetch or update state — the
  // dropdown itself is already gated on `memberQuery.trim()` in the JSX
  // below, so a stale `candidateResidents` value has no visible effect and
  // there's no need to synchronously clear it here.
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
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

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/households")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
          >
            <ArrowLeft size={14} />
            Back to Households
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#1F2937]">{household.household_no}</h1>
            <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
              {household.purok.name}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF]">{household.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7] print:hidden"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={() => router.push(`/households/${household.id}/edit`)}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{actionError}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left: household info ── */}
        <div className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <p className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
              Household Information
            </p>
            <div className="space-y-4">
              <InfoTile icon={MapPin} label="Address" value={household.address} />
              <InfoTile icon={Home} label="Housing Type" value={HOUSING_LABEL[household.housing_type ?? ""] ?? "—"} />
              <InfoTile icon={Droplets} label="Water Source" value={WATER_LABEL[household.water_source ?? ""] ?? "—"} />
              <InfoTile icon={DoorOpen} label="Comfort Room" value={CR_LABEL[household.comfort_room ?? ""] ?? "—"} />
              <InfoTile icon={Users} label="No. of Members" value={String(household.members.length)} />
            </div>
            <div className="mt-4 border-t border-[#F4F5F7] pt-3 text-[11px] text-[#9CA3AF]">
              Registered {formatISODate(household.created_at)}
              {household.updated_at !== household.created_at && (
                <> &middot; Updated {formatISODate(household.updated_at)}</>
              )}
            </div>
          </div>

          {/* Household head */}
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Crown size={14} className="text-[#D97706]" />
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Household Head</p>
            </div>
            {household.household_head ? (
              <div>
                <p className="text-[14px] font-bold text-[#1F2937]">{memberFullName(household.household_head)}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                  {household.household_head.sex} &middot; {calcAge(household.household_head.birthdate)} yrs old
                  &middot; {household.household_head.occupation ?? "N/A"}
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-[#9CA3AF]">
                No household head assigned. Set one from the members list on the right.
              </p>
            )}
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-[#FEE2E2] bg-white p-5">
            <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#DC2626]">Danger Zone</p>
            <p className="mb-3 text-[11px] text-[#9CA3AF]">
              Deleting a household does not delete its members&apos; resident records, but unlinks them.
            </p>
            <button
              onClick={() => setDeleteHouseholdConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-[#FEE2E2] px-4 py-2 text-[12px] font-bold text-[#DC2626] transition hover:bg-[#FEE2E2]"
            >
              <Trash2 size={13} />
              Delete Household
            </button>
          </div>
        </div>

        {/* ── Right: members ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                Household Members ({household.members.length})
              </p>
              <button
                onClick={() => setShowAddMember((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB]"
              >
                <Plus size={13} />
                Add Member
              </button>
            </div>

            {showAddMember && (
              <div className="relative mb-4">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search unassigned residents by name..."
                  autoFocus
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#3B82F6]"
                />
                {memberQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
                    {candidateResidents.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No matching residents found</p>
                    ) : (
                      candidateResidents.map((r: HouseholdMemberMock) => (
                        <button
                          key={r.id}
                          disabled={busy}
                          onClick={() => handleAddMember(r)}
                          className="flex w-full items-center justify-between border-b border-[#F4F5F7] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB] disabled:opacity-50"
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-[#1F2937]">{memberFullName(r)}</p>
                            <p className="text-[11px] text-[#9CA3AF]">
                              {r.sex} &middot; {calcAge(r.birthdate)} yrs old
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-[#3B82F6]">Add</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {household.members.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[#9CA3AF]">
                No members yet. Use &quot;Add Member&quot; to attach existing residents to this household.
              </p>
            ) : (
              <div className="space-y-2">
                {household.members.map((m: HouseholdMemberMock) => {
                  const isHead = household.household_head_id === m.id;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-[#E9EAEC] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-bold text-[#1F2937]">{memberFullName(m)}</p>
                          {isHead && (
                            <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                              <Crown size={10} />
                              Head
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
                          {m.sex} &middot; {calcAge(m.birthdate)} yrs old &middot; {m.civil_status} &middot;{" "}
                          {m.occupation ?? "N/A"}
                        </p>
                      </div>
                      {!isHead && (
                        <button
                          onClick={() => handleSetHead(m)}
                          disabled={busy}
                          className="shrink-0 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-semibold text-[#6B7280] transition hover:bg-[#F4F5F7] disabled:opacity-50"
                        >
                          Set as Head
                        </button>
                      )}
                      <button
                        onClick={() => setRemoveTarget(m)}
                        disabled={busy}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#FEE2E2] hover:text-[#DC2626] disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
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
    </div>
  );
}