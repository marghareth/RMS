// FILE: src/components/blotter/BlotterCaseSheet.tsx
//
// The blotter case detail + "add update" view, as a slide-over instead of
// a full page navigation. Content here is the same as
// (dashboard)/blotter/[id]/page.tsx — just re-homed so it can render inside
// <Sheet> and be driven by a `caseId` prop from the list page.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, UserX, Calendar, Clock, AlertTriangle, FileText,
  Phone, MapPin, Send, ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import { BlotterCaseMock, BlotterStatus, formatISODate } from "@/lib/mock/blotter";

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <p className="text-[13px] text-[#1F2937]">{value || "—"}</p>
      </div>
    </div>
  );
}

interface BlotterCaseSheetProps {
  /** The case to show, or null to keep the sheet closed. */
  caseId: number | null;
  onClose: () => void;
  /** Called after a successful update, so the list page can refetch. */
  onUpdated?: () => void;
}

export default function BlotterCaseSheet({ caseId, onClose, onUpdated }: BlotterCaseSheetProps) {
  const router = useRouter();
  const open = caseId !== null;

  const [blotterCase, setBlotterCase] = useState<BlotterCaseMock | null>(null);
  const [loading, setLoading] = useState(true);

  // Update form state — declared before any effect/render-time logic that
  // references their setters.
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState<BlotterStatus | "">("");
  const [hearingDate, setHearingDate] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The sheet stays mounted while the user switches between cases (only
  // `caseId` changes), so — unlike a page that remounts on navigation —
  // stale state from the previous case has to be reset explicitly. This is
  // done synchronously during render (React's documented "adjusting state
  // when a prop changes" pattern) rather than in an effect, so it doesn't
  // trip the set-state-in-effect rule and doesn't cause an extra render.
  const [syncedCaseId, setSyncedCaseId] = useState<number | null>(null);
  if (caseId !== null && caseId !== syncedCaseId) {
    setSyncedCaseId(caseId);
    setBlotterCase(null);
    setLoading(true);
    setNotes("");
    setNewStatus("");
    setHearingDate("");
    setEscalate(false);
  } else if (caseId === null && syncedCaseId !== null) {
    // Sheet is closing — just clear the tracker (not the visible data),
    // so content doesn't flash empty mid slide-out transition.
    setSyncedCaseId(null);
  }

  // Fetching is the actual "synchronize with an external system" work, so
  // it stays in an effect. Unlike `loadCase` below (reused from the
  // "Add Update" button handler), this is written as a plain .then() chain
  // rather than calling a named async function — the lint rule flags any
  // direct call to a function whose body sets state, even if every
  // setState happens after an await, so the fetch has to be inlined here.
  async function loadCase(id: number) {
    try {
      const res = await fetch(`/api/blotter/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setBlotterCase(data);
      setEscalate(data.escalated);
    } catch (e) {
      console.error(e);
      setBlotterCase(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (caseId === null) return;
    let cancelled = false;

    fetch(`/api/blotter/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBlotterCase(data);
        setEscalate(data.escalated);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setBlotterCase(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const sortedUpdates = useMemo(() => {
    if (!blotterCase) return [];
    return [...blotterCase.updates].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [blotterCase]);

  async function handleAddUpdate() {
    if (!blotterCase || !notes.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/blotter/${blotterCase.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, new_status: newStatus || undefined }),
      });
      if (hearingDate || escalate !== blotterCase.escalated) {
        await fetch(`/api/blotter/${blotterCase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hearing_date: hearingDate || undefined, escalated: escalate }),
        });
      }
      await loadCase(blotterCase.id);
      onUpdated?.();
      setNotes("");
      setNewStatus("");
      setHearingDate("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || !blotterCase ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading case…" : "Case not found"}</SheetTitle>
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
                  title="Case not found"
                  description="This blotter case doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{blotterCase.case_number}</SheetTitle>
                  <StatusBadge status={blotterCase.status} />
                  {blotterCase.escalated && <StatusBadge status="ESCALATED" />}
                </div>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                  Filed {formatISODate(blotterCase.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/blotter/${blotterCase.id}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-5">
              {/* Parties */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
                      <User size={14} className="text-[#1D4ED8]" />
                    </div>
                    <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Complainant</p>
                  </div>
                  <InfoRow icon={User} label="Full Name" value={blotterCase.complainant_name} />
                  <InfoRow icon={Phone} label="Contact" value={blotterCase.complainant_contact} />
                  <InfoRow icon={MapPin} label="Address" value={blotterCase.complainant_address} />
                </div>

                <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEE2E2]">
                      <UserX size={14} className="text-[#DC2626]" />
                    </div>
                    <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Respondent</p>
                  </div>
                  <InfoRow icon={User} label="Full Name" value={blotterCase.respondent_name} />
                  <InfoRow
                    icon={FileText}
                    label="Resident Record"
                    value={blotterCase.respondent_id ? `Linked · RBI #${blotterCase.respondent_id}` : "Not linked / walk-in"}
                  />
                </div>
              </div>

              {/* Narrative */}
              <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                  Incident Narrative
                </p>
                <p className="text-[13px] leading-relaxed text-[#374151]">{blotterCase.incident_narrative}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#F4F5F7] pt-3">
                  <InfoRow icon={Calendar} label="Incident Date" value={formatISODate(blotterCase.incident_date)} />
                  <InfoRow icon={Clock} label="Hearing Date" value={formatISODate(blotterCase.hearing_date) ?? "Not scheduled"} />
                </div>
              </div>

              {/* Updates timeline */}
              <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                  Case Updates ({sortedUpdates.length})
                </p>
                {sortedUpdates.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-[#9CA3AF]">No updates recorded yet.</p>
                ) : (
                  <div className="space-y-0">
                    {sortedUpdates.map((u, idx) => (
                      <div key={u.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {idx !== sortedUpdates.length - 1 && (
                          <span className="absolute left-1.75 top-4 h-full w-px bg-[#E9EAEC]" />
                        )}
                        <span className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-[#3B82F6] shadow-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-bold text-[#1F2937]">{u.updater_name}</p>
                            <p className="shrink-0 text-[11px] text-[#9CA3AF]">
                              {new Date(u.updated_at).toLocaleString("en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[13px] text-[#374151]">{u.notes}</p>
                          {u.new_status && (
                            <div className="mt-1.5">
                              <StatusBadge status={u.new_status} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add update */}
              <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                  Add Update
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe what happened during this update / hearing..."
                      className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        New Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as BlotterStatus | "")}
                        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
                      >
                        <option value="">Keep current status</option>
                        <option value="FILED">Filed</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="DISMISSED">Dismissed</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Reschedule Hearing
                      </label>
                      <input
                        type="date"
                        value={hearingDate}
                        onChange={(e) => setHearingDate(e.target.value)}
                        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 rounded-lg bg-[#FEF3C7] px-3 py-2.5 text-[12px] font-medium text-[#92400E]">
                    <input
                      type="checkbox"
                      checked={escalate}
                      onChange={(e) => setEscalate(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#D97706] text-[#D97706] focus:ring-[#D97706]"
                    />
                    <AlertTriangle size={13} className="shrink-0" />
                    Escalate to higher agency
                  </label>

                  <button
                    onClick={handleAddUpdate}
                    disabled={submitting || !notes.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
                  >
                    <Send size={13} />
                    {submitting ? "Saving..." : "Save Update"}
                  </button>
                </div>
              </div>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}