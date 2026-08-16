// src/components/officials/OfficialEditSheet.tsx
//
// The "Edit Official" form, as a slide-over instead of a full page
// navigation. Content mirrors (dashboard)/officials/[id]/edit/page.tsx
// (which still exists for direct links/bookmarks), just re-homed so it
// can render inside <Sheet> and be driven by an `officialId` prop from
// the officials list page. Mirrors the pattern set by the other detail
// sheets in this app.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Phone, ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import {
  POSITIONS, PUROK_ASSIGNMENTS, BrgyOfficialMock, residentFullName,
} from "@/lib/mock/officials";

interface OfficialEditSheetProps {
  /** The official to edit, or null to keep the sheet closed. */
  officialId: number | null;
  onClose: () => void;
  /** Called with the updated record after a successful save. */
  onSaved?: (updated: BrgyOfficialMock) => void;
}

export default function OfficialEditSheet({ officialId, onClose, onSaved }: OfficialEditSheetProps) {
  const router = useRouter();
  const open = officialId !== null;

  const [original, setOriginal] = useState<BrgyOfficialMock | null>(null);
  const [loading, setLoading] = useState(true);

  const [position, setPosition] = useState("");
  const [purokAssignment, setPurokAssignment] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (officialId !== null && officialId !== syncedId) {
    setSyncedId(officialId);
    setOriginal(null);
    setLoading(true);
    setError("");
  } else if (officialId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (officialId === null) return;
    let cancelled = false;

    fetch(`/api/officials/${officialId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data: BrgyOfficialMock) => {
        if (cancelled) return;
        setOriginal(data);
        setPosition(data.position);
        setPurokAssignment(data.purok_assignment ?? "");
        setContactNo(data.contact_no ?? "");
        setTermStart(data.term_start.slice(0, 10));
        setTermEnd(data.term_end ? data.term_end.slice(0, 10) : "");
        setIsActive(data.is_active);
      })
      .catch(() => { if (!cancelled) setOriginal(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [officialId]);

  async function handleSubmit() {
    if (!original) return;
    setError("");
    if (!position) { setError("Please select a position."); return; }
    if (!termStart) { setError("Please provide a term start date."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/officials/${original.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position,
          contact_no: contactNo || null,
          purok_assignment: purokAssignment || null,
          term_start: termStart,
          term_end: termEnd || null,
          is_active: isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Failed to update official.");
        return;
      }
      const updated: BrgyOfficialMock = await res.json();
      onSaved?.(updated);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent widthClassName="max-w-2xl" className="p-0">
        {loading || !original ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Official not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={UserCheck}
                  title="Official not found"
                  description="This official record doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 text-[13px] font-black text-[#1D4ED8] dark:text-[#93C5FD]">
                  {original.resident.fname[0]}
                  {original.resident.lname[0]}
                </div>
                <div className="min-w-0">
                  <SheetTitle>Edit Official</SheetTitle>
                  <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{residentFullName(original.resident)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/officials/${original.id}/edit`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {/* Resident (read-only) */}
              <div className="flex items-center gap-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 text-[13px] font-black text-[#1D4ED8] dark:text-[#93C5FD]">
                  {original.resident.fname[0]}
                  {original.resident.lname[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1F2937] dark:text-white">{residentFullName(original.resident)}</p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                    Linked resident cannot be changed — remove and re-add to reassign.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7] dark:bg-[#262626]">
                    <Phone size={14} className="text-[#374151] dark:text-[#D4D4D4]" />
                  </div>
                  <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Official Details</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Position
                      </label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      >
                        <option value="">Select position</option>
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Purok Assignment
                      </label>
                      <select
                        value={purokAssignment}
                        onChange={(e) => setPurokAssignment(e.target.value)}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      >
                        <option value="">None</option>
                        {PUROK_ASSIGNMENTS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                      Contact No.
                    </label>
                    <input
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      placeholder="09XX-XXX-XXXX"
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Term Start
                      </label>
                      <input
                        type="date"
                        value={termStart}
                        onChange={(e) => setTermStart(e.target.value)}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Term End <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={termEnd}
                        onChange={(e) => setTermEnd(e.target.value)}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151] dark:text-[#D4D4D4]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] dark:text-[#60A5FA] focus:ring-[#3B82F6] dark:focus:ring-[#60A5FA]"
                    />
                    Active
                  </label>

                  {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                onClick={onClose}
                className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}