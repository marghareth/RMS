// src/components/registries/RegistryManager.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, Search, X, Loader2 } from "lucide-react";
import ResidentPicker, { type PickedResident } from "@/components/shared/ResidentPicker";
import RegistryDetailSheet from "@/components/registries/RegistryDetailSheet";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RegistryType = "FOUR_PS" | "PWD" | "SENIOR_CITIZEN";

interface RegistryEntry {
  id: number;
  resident_id: number;
  registry_type: RegistryType;
  disability_type: string | null;
  is_4ps_beneficiary: boolean;
  registered_at: string;
  resident: PickedResident;
}

interface RegistryManagerProps {
  registryType: RegistryType;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconBg?: string;
  addNote?: string;
  minAge?: number;
  detailBase: string;
}

function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

// ─── ADD MODAL ────────────────────────────────────────────────────────────────
function AddModal({
  registryType,
  minAge,
  onClose,
  onAdded,
}: {
  registryType: RegistryType;
  minAge?: number;
  onClose: () => void;
  onAdded: (entry: RegistryEntry) => void;
}) {
  const [resident, setResident] = useState<PickedResident | null>(null);
  const [disabilityType, setDisabilityType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!resident) {
      setError("Select a resident first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/registries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: resident.id,
          registry_type: registryType,
          disability_type: registryType === "PWD" ? disabilityType || null : null,
          is_4ps_beneficiary: registryType === "FOUR_PS" ? true : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to add resident to this registry.");
        return;
      }

      onAdded(data as RegistryEntry);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#171717] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#1F2937] dark:text-white">Add to Registry</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#9CA3AF] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#374151] dark:hover:text-[#D4D4D4]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">
              Resident
            </label>
            <ResidentPicker value={resident} onChange={setResident} minAge={minAge} />
          </div>

          {registryType === "PWD" && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">
                Disability Type
              </label>
              <input
                value={disabilityType}
                onChange={(e) => setDisabilityType(e.target.value)}
                placeholder="e.g. Mobility, Visual, Hearing"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
          )}

          {error && <p className="text-[12px] font-medium text-red-500 dark:text-red-400">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#E9EAEC] dark:border-[#262626] py-2.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !resident}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-2.5 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RegistryManager({
  registryType,
  title,
  subtitle,
  icon: Icon,
  iconBg = "bg-[#3B82F6]",
  addNote,
  minAge,
  detailBase,
}: RegistryManagerProps) {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registries?registry_type=${registryType}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [registryType]);

  useEffect(() => {
    let cancelled = false;
    // Deferred so no setState call is made synchronously within the effect
    // body itself (avoids react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      if (!cancelled) loadEntries();
    });
    return () => { cancelled = true; };
  }, [loadEntries]);

  const filteredEntries = (() => {
    if (!search.trim()) return entries;
    const keyword = search.toLowerCase();
    return entries.filter(
      (entry) =>
        `${entry.resident.fname} ${entry.resident.lname}`.toLowerCase().includes(keyword) ||
        entry.resident.purok?.name.toLowerCase().includes(keyword)
    );
  })();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} text-white`}>
                <Icon size={18} />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-[#1F2937] dark:text-white leading-tight">{title}</h1>
                <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{subtitle}</p>
              </div>
            </div>
            {addNote && <p className="mt-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{addNote}</p>}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] font-semibold text-[#1F2937] dark:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 shadow-sm">
        <div className="relative mb-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resident"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-[#F4F5F7] dark:bg-[#262626] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:bg-white dark:focus:bg-[#171717]"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#3B82F6] dark:text-[#60A5FA]" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] p-6 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            No residents found in this registry yet.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntryId(entry.id)}
                className="flex w-full items-center justify-between rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3 text-left transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white">
                    {entry.resident.fname} {entry.resident.lname}
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
                    {entry.resident.purok?.name ?? "No purok"} · {calcAge(entry.resident.birthdate)} yrs old
                  </p>
                </div>
                <div className="rounded-full bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3B82F6] dark:text-[#60A5FA]">
                  {title}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddModal
          registryType={registryType}
          minAge={minAge}
          onClose={() => setShowAddModal(false)}
          onAdded={(entry) => {
            setEntries((prev) => [entry, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}

      <RegistryDetailSheet
        entryId={selectedEntryId}
        title={title}
        icon={Icon}
        iconBg={iconBg}
        listBase={detailBase}
        onClose={() => setSelectedEntryId(null)}
        onRemoved={loadEntries}
      />
    </div>
  );
}