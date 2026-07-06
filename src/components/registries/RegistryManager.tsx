"use client";

import { useCallback, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, Search, ChevronRight, Trash2, X } from "lucide-react";
import {
  getMockRegistries,
  addMockRegistry,
  deleteMockRegistry,
  nextMockRegistryId,
  type RegistryEntry,
} from "@/lib/mockRegistries";
import { getMockResidents, updateMockResident, type Resident } from "@/lib/mockResidents";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type RegistryType = "SENIOR_CITIZEN" | "PWD" | "FOUR_PS";

interface RegistryManagerProps {
  registryType: RegistryType;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  addNote?: string;
  minAge?: number;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function fullName(r: Resident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="min-w-40 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#374151]">
        {label}
      </span>
      <span className="text-[11px] text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

function Pill({ tone, children }: { tone: "green" | "amber" | "blue" | "gray"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-[#D1FAE5] text-[#059669]",
    amber: "bg-[#FEF3C7] text-[#D97706]",
    blue: "bg-[#EBF3FF] text-[#1D4ED8]",
    gray: "bg-[#E9EAEC] text-[#6B7280]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

// Lightweight resident search over the shared mock resident pool, excluding
// residents already registered under this registry type. Mirrors the
// dedicated ResidentPicker used elsewhere, but sourced from mockResidents.ts
// so this module stays consistent with the Residents feature's data layer.
function ResidentSearch({
  excludeIds,
  minAge,
  onSelect,
}: {
  excludeIds: Set<number>;
  minAge?: number;
  onSelect: (resident: Resident) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return getMockResidents()
      .filter((r) => !excludeIds.has(r.id))
      .filter((r) => fullName(r).toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, excludeIds]);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search resident by name..."
          className="w-full rounded-lg border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No matching residents found</p>
          ) : (
            results.map((r) => {
              const age = calcAge(r.birthdate);
              const belowMinAge = minAge !== undefined && age < minAge;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelect(r);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 border-b border-[#F4F5F7] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1F2937]">{fullName(r)}</p>
                    <p className="truncate text-[11px] text-[#9CA3AF]">
                      {r.sex} &middot; {age} yrs old &middot; {r.purok?.name ?? "No purok"}
                    </p>
                  </div>
                  {belowMinAge && (
                    <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                      Under {minAge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function RegistryManager({
  registryType,
  title,
  subtitle,
  icon: Icon,
  addNote,
  minAge,
}: RegistryManagerProps) {
  const [entries, setEntries] = useState<RegistryEntry[]>(() =>
    getMockRegistries().filter((e) => e.registry_type === registryType)
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RegistryEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [pickedResident, setPickedResident] = useState<Resident | null>(null);
  const [disabilityType, setDisabilityType] = useState("");
  const [formError, setFormError] = useState("");

  // Remove flow
  const [removeTarget, setRemoveTarget] = useState<RegistryEntry | null>(null);

  const refresh = useCallback(() => {
    setEntries(getMockRegistries().filter((e) => e.registry_type === registryType));
  }, [registryType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        fullName(e.resident).toLowerCase().includes(q) ||
        (e.resident.purok?.name ?? "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const excludeIds = useMemo(() => new Set(entries.map((e) => e.resident_id)), [entries]);

  function openAdd() {
    setSelected(null);
    setPickedResident(null);
    setDisabilityType("");
    setFormError("");
    setShowAdd(true);
  }

  function handleSave() {
    if (!pickedResident) {
      setFormError("Please select a resident.");
      return;
    }
    if (registryType === "PWD" && !disabilityType.trim()) {
      setFormError("Please specify the disability type.");
      return;
    }

    const newEntry: RegistryEntry = {
      id: nextMockRegistryId(),
      resident_id: pickedResident.id,
      registry_type: registryType,
      disability_type: registryType === "PWD" ? disabilityType.trim() : null,
      is_4ps_beneficiary: registryType === "FOUR_PS",
      registered_at: new Date().toISOString(),
      resident: pickedResident,
    };

    addMockRegistry(newEntry);

    // Keep the resident's own embedded special_registries list in sync so
    // the Resident detail page (which reads resident.special_registries
    // directly) reflects this addition too.
    updateMockResident(pickedResident.id, {
      special_registries: [
        ...pickedResident.special_registries,
        { id: newEntry.id, registry_type: newEntry.registry_type, disability_type: newEntry.disability_type },
      ],
    });

    refresh();
    setShowAdd(false);
  }

  function handleRemove() {
    if (!removeTarget) return;

    deleteMockRegistry(removeTarget.id);
    updateMockResident(removeTarget.resident_id, {
      special_registries: removeTarget.resident.special_registries.filter((sr) => sr.id !== removeTarget.id),
    });

    setRemoveTarget(null);
    setSelected(null);
    refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-124px)] gap-5">
      {/* ── Left: List panel ── */}
      <div className="relative flex w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {/* Header */}
        <div className="border-b border-[#E9EAEC] px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF3FF]">
                <Icon size={16} className="text-[#1D4ED8]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[#1F2937]">{title}</p>
                <p className="truncate text-[11px] text-[#9CA3AF]">{subtitle}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#F4F5F7] px-2 py-1 text-[10px] font-bold text-[#6B7280]">
              {entries.length}
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or purok"
              className="w-full rounded-xl border border-transparent bg-[#F4F5F7] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-[12px] text-[#9CA3AF]">No entries found</p>
            </div>
          ) : (
            filtered.map((entry) => {
              const active = selected?.id === entry.id && !showAdd;
              return (
                <button
                  key={entry.id}
                  onClick={() => {
                    setShowAdd(false);
                    setSelected(entry);
                  }}
                  className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] px-4 py-3 text-left transition ${
                    active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937]"}`}>
                      {fullName(entry.resident)}
                    </p>
                    <p className={`mt-0.5 text-[11px] ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                      {entry.resident.sex}
                      {registryType === "SENIOR_CITIZEN" && ` · ${calcAge(entry.resident.birthdate)} yrs`}
                      {registryType === "PWD" && entry.disability_type ? ` · ${entry.disability_type}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className={`text-[10px] font-semibold ${active ? "text-blue-100" : "text-[#6B7280]"}`}>
                      {entry.resident.purok?.name ?? "—"}
                    </span>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Add button */}
        <div className="flex justify-end border-t border-[#F4F5F7] p-4">
          <button
            onClick={openAdd}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-md transition hover:bg-[#D97706]"
            aria-label={`Add to ${title}`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* ── Right: Detail / Add panel ── */}
      {showAdd ? (
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white p-6">
          <div className="mb-5 flex items-start justify-between border-b border-[#E9EAEC] pb-4">
            <div>
              <h2 className="text-[15px] font-black uppercase tracking-wide text-[#1F2937]">Add to {title}</h2>
              {addNote && <p className="mt-1 text-[12px] text-[#6B7280]">{addNote}</p>}
            </div>
            <button
              onClick={() => setShowAdd(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#374151]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Resident
              </label>
              {pickedResident ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1F2937]">{fullName(pickedResident)}</p>
                    <p className="truncate text-[11px] text-[#9CA3AF]">
                      {pickedResident.sex} &middot; {calcAge(pickedResident.birthdate)} yrs old &middot;{" "}
                      {pickedResident.purok?.name ?? "No purok"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickedResident(null)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-[#E9EAEC] hover:text-[#374151]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <ResidentSearch excludeIds={excludeIds} minAge={minAge} onSelect={setPickedResident} />
              )}
              {minAge && pickedResident && calcAge(pickedResident.birthdate) < minAge && (
                <p className="mt-1.5 text-[11px] text-[#D97706]">
                  This resident is under {minAge}. They can still be added manually (flagged registration).
                </p>
              )}
            </div>

            {registryType === "PWD" && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Disability Type
                </label>
                <input
                  value={disabilityType}
                  onChange={(e) => setDisabilityType(e.target.value)}
                  placeholder="e.g. Visual, Hearing, Physical, Intellectual"
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                />
              </div>
            )}

            {registryType === "FOUR_PS" && pickedResident && (
              <div className="rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Household Preview</p>
                <p className="mt-1 text-[12px] text-[#374151]">
                  {pickedResident.household
                    ? `${pickedResident.household.household_no} · ${pickedResident.household.address} · ${pickedResident.household.members.length} member(s)`
                    : "This resident has no household on file yet."}
                </p>
              </div>
            )}

            {formError && (
              <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-[12px] text-[#DC2626]">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : selected ? (
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white p-6">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between border-b border-[#E9EAEC] pb-4">
            <h2 className="text-[15px] font-black uppercase tracking-wide text-[#1F2937]">
              {fullName(selected.resident)}
            </h2>
            <span className="text-[13px] font-bold uppercase tracking-widest text-[#1F2937]">
              {selected.resident.sex}
            </span>
          </div>

          {/* Common info */}
          <div className="mb-5">
            <InfoRow label="RBI ID" value={`BM${String(selected.resident.id).padStart(7, "0")}`} />
            <InfoRow label="Date of Birth" value={formatDate(selected.resident.birthdate)} />
            <InfoRow label="Civil Status" value={selected.resident.civil_status.replace("_", "-")} />
            <InfoRow label="Purok" value={selected.resident.purok?.name} />
            <InfoRow label="Date Registered" value={formatDate(selected.registered_at)} />
          </div>

          {/* Type-specific block */}
          <div className="mb-5 border-t border-[#E9EAEC] pt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">
              {registryType === "SENIOR_CITIZEN" && "Senior Citizen Information"}
              {registryType === "PWD" && "PWD Information"}
              {registryType === "FOUR_PS" && "4Ps Beneficiary Information"}
            </p>

            {registryType === "SENIOR_CITIZEN" && (
              <>
                <InfoRow label="Age" value={`${calcAge(selected.resident.birthdate)} years old`} />
                <div className="py-1">
                  {calcAge(selected.resident.birthdate) >= (minAge ?? 60) ? (
                    <Pill tone="green">Eligible &middot; Auto-flagged {minAge ?? 60}+</Pill>
                  ) : (
                    <Pill tone="amber">Manually Added &middot; Below {minAge ?? 60}</Pill>
                  )}
                </div>
              </>
            )}

            {registryType === "PWD" && (
              <>
                <InfoRow label="Disability Type" value={selected.disability_type ?? "Not specified"} />
                <InfoRow label="Age" value={`${calcAge(selected.resident.birthdate)} years old`} />
              </>
            )}

            {registryType === "FOUR_PS" && (
              <>
                <InfoRow label="Household No." value={selected.resident.household?.household_no} />
                <InfoRow label="Household Address" value={selected.resident.household?.address} />
                <InfoRow
                  label="No. of Household Members"
                  value={selected.resident.household?.members.length ?? "—"}
                />
                <div className="py-1">
                  <Pill tone={selected.is_4ps_beneficiary ? "green" : "gray"}>
                    {selected.is_4ps_beneficiary ? "Active Beneficiary" : "Inactive"}
                  </Pill>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#E9EAEC] pt-4">
            <button
              onClick={() => setRemoveTarget(selected)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#DC2626] transition hover:text-[#991B1B]"
            >
              <Trash2 size={13} />
              Remove from Registry
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-[#E9EAEC] bg-white">
          <EmptyState
            icon={Icon}
            title={`No ${title.toLowerCase()} selected`}
            description={`Select an entry from the list, or add a new one to the ${title.toLowerCase()} registry.`}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove from registry?"
        message={
          removeTarget
            ? `${fullName(removeTarget.resident)} will be removed from the ${title.toLowerCase()} registry. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}