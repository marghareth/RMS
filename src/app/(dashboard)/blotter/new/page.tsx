"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  UserX,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  MapPin,
  Send,
  Printer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import {
  BlotterCaseMock,
  BlotterStatus,
  BlotterUpdateMock,
  formatISODate,
} from "@/lib/mock/blotter";

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

export default function BlotterCaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = Number(params.id);

  const [blotterCase, setBlotterCase] = useState<BlotterCaseMock | null>(null);
  const [loading, setLoading] = useState(true);

  // Reusable loader, called from the mount effect below and again after a
  // write in handleAddUpdate to re-sync with server state.
  async function loadCase() {
    setLoading(true);
    try {
      const res = await fetch(`/api/blotter/${caseId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setBlotterCase(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch(`/api/blotter/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setBlotterCase(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [caseId]);

  // Update form state
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState<BlotterStatus | "">("");
  const [hearingDate, setHearingDate] = useState("");
  const [escalate, setEscalate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // blotterCase loads asynchronously after mount, so the initial
  // `useState(false)` above can't see its real `escalated` value yet.
  // Rather than syncing it in an effect (which is unnecessary-effect /
  // derived-state territory), adjust it directly during render the first
  // time we see this case's data — the officially recommended pattern for
  // resetting/seeding state when an external value changes.
  const [syncedCaseId, setSyncedCaseId] = useState<number | null>(null);
  if (blotterCase && syncedCaseId !== blotterCase.id) {
    setSyncedCaseId(blotterCase.id);
    setEscalate(blotterCase.escalated);
  }

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
      await fetch(`/api/blotter/${caseId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, new_status: newStatus || undefined }),
      });
      if (hearingDate || escalate !== blotterCase.escalated) {
        await fetch(`/api/blotter/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hearing_date: hearingDate || undefined,
            escalated: escalate,
          }),
        });
      }
      await loadCase(); // re-fetch to sync with server state
      setNotes("");
      setNewStatus("");
      setHearingDate("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  if (!blotterCase) {
    return (
      <EmptyState
        icon={FileText}
        title="Case not found"
        description="This blotter case doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/blotter")}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Blotter
          </button>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/blotter")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
          >
            <ArrowLeft size={14} />
            Back to Blotter
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#1F2937]">{blotterCase.case_number}</h1>
            <StatusBadge status={blotterCase.status} />
            {blotterCase.escalated && <StatusBadge status="ESCALATED" />}
          </div>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
            Filed {formatISODate(blotterCase.created_at)}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7] print:hidden"
        >
          <Printer size={14} />
          Print Case Record
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left column: case details ── */}
        <div className="space-y-5 lg:col-span-2">
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
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
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
        </div>

        {/* ── Right column: add update form ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-5 rounded-xl border border-[#E9EAEC] bg-white p-4">
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
                  rows={4}
                  placeholder="Describe what happened during this update / hearing..."
                  className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                />
              </div>

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
        </div>
      </div>
    </div>
  );
}