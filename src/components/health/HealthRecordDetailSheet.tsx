// src/components/health/HealthRecordDetailSheet.tsx
//
// The health record detail view, as a slide-over instead of a full page
// navigation. Content mirrors (dashboard)/health/[id]/page.tsx (which
// still exists for direct links/bookmarks), just re-homed so it can
// render inside <Sheet> and be driven by a `recordId` prop from the
// /health list page. Mirrors the pattern set by VaccinationDetailSheet.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart, User, CalendarDays, Pencil, Trash2, FileText, Clock, ExternalLink,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident {
  id: number; fname: string; lname: string;
  birthdate: string; sex: string;
  purok?: { name: string } | null;
}
interface HealthRecord {
  id: number;
  resident_id: number;
  record_type: string;
  notes: string | null;
  recorded_at: string;
  resident: Resident;
  recorder: { id: number; username: string };
}

interface HealthRecordDetailSheetProps {
  /** The health record to show, or null to keep the sheet closed. */
  recordId: number | null;
  onClose: () => void;
  /** Called after a successful deletion, so the list page can refetch. */
  onDeleted?: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; icon_bg: string }> = {
  Hypertension: { bg: "bg-red-50", text: "text-red-700", icon_bg: "bg-red-500" },
  Diabetes: { bg: "bg-amber-50", text: "text-amber-700", icon_bg: "bg-amber-500" },
  Tuberculosis: { bg: "bg-orange-50", text: "text-orange-700", icon_bg: "bg-orange-500" },
  "Prenatal Checkup": { bg: "bg-pink-50", text: "text-pink-700", icon_bg: "bg-pink-500" },
  "Well-child Checkup": { bg: "bg-green-50", text: "text-green-700", icon_bg: "bg-green-500" },
  Asthma: { bg: "bg-blue-50", text: "text-blue-700", icon_bg: "bg-blue-500" },
  "Family Planning": { bg: "bg-purple-50", text: "text-purple-700", icon_bg: "bg-purple-500" },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-[#F4F5F7] py-2.5 last:border-0">
      <span className="mt-0.5 min-w-30 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</span>
      <span className="text-[13px] font-medium text-[#1F2937]">{value ?? "—"}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HealthRecordDetailSheet({ recordId, onClose, onDeleted }: HealthRecordDetailSheetProps) {
  const router = useRouter();
  const open = recordId !== null;

  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (recordId !== null && recordId !== syncedId) {
    setSyncedId(recordId);
    setRecord(null);
    setLoading(true);
    setDeleteError("");
  } else if (recordId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (recordId === null) return;
    let cancelled = false;

    fetch(`/api/health/${recordId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (!cancelled) setRecord(data); })
      .catch(() => { if (!cancelled) setRecord(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [recordId]);

  async function handleDelete() {
    if (!record) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/health/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      onDeleted?.();
      onClose();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  const cfg = record ? (TYPE_COLORS[record.record_type] ?? { bg: "bg-gray-50", text: "text-gray-700", icon_bg: "bg-gray-500" }) : null;

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent widthClassName="max-w-3xl" className="p-0">
        {loading || !record || !cfg ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Record not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="Record not found"
                  description="This health record doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.icon_bg}`}>
                  <Heart size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <SheetTitle>{record.record_type}</SheetTitle>
                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">Health Record #{String(record.id).padStart(5, "0")}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/health/${record.id}/edit`)}
                  title="Edit"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => router.push(`/health/${record.id}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-[12px] font-medium text-red-600">{deleteError}</p>
                </div>
              )}

              {/* Record type banner */}
              <div className={`flex items-center gap-4 rounded-xl border px-5 py-4 border-current border-opacity-20 ${cfg.bg}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cfg.icon_bg}`}>
                  <Heart size={22} className="text-white" />
                </div>
                <div>
                  <p className={`text-[16px] font-black uppercase tracking-wide ${cfg.text}`}>{record.record_type}</p>
                  <p className={`mt-0.5 text-[11px] font-medium opacity-70 ${cfg.text}`}>
                    Recorded on {fmtDateTime(record.recorded_at)} · by {record.recorder.username}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Left: Notes + Meta */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText size={14} className="text-[#6B7280]" />
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Notes / Findings</p>
                    </div>
                    {record.notes ? (
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#374151]">{record.notes}</p>
                    ) : (
                      <p className="text-[13px] italic text-[#9CA3AF]">No notes recorded.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Record Details</p>
                    <InfoRow label="Record ID" value={`#${String(record.id).padStart(5, "0")}`} />
                    <InfoRow label="Recorded By" value={record.recorder.username} />
                    <InfoRow
                      label="Date & Time"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#9CA3AF]" />
                          {fmtDateTime(record.recorded_at)}
                        </span>
                      }
                    />
                  </div>
                </div>

                {/* Right: Resident + Quick actions */}
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]">
                        <User size={13} className="text-white" />
                      </div>
                      <p className="text-[12px] font-bold text-[#1F2937]">Resident</p>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex flex-col items-center pt-1 text-center">
                        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF]">
                          <User size={24} className="text-[#3B82F6]" />
                        </div>
                        <p className="text-[14px] font-black text-[#1F2937]">
                          {record.resident.lname}, {record.resident.fname}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{record.resident.purok?.name ?? "—"}</p>
                      </div>
                      <InfoRow label="Age" value={`${calcAge(record.resident.birthdate)} years old`} />
                      <InfoRow label="Sex" value={record.resident.sex} />
                      <InfoRow label="Purok" value={record.resident.purok?.name} />
                      <InfoRow label="Birthdate" value={fmtDate(record.resident.birthdate)} />
                      <button
                        onClick={() => router.push(`/residents/${record.resident_id}`)}
                        className="mt-3 w-full rounded-xl bg-[#EFF6FF] py-2 text-[12px] font-bold text-[#3B82F6] transition hover:bg-blue-100"
                      >
                        View Full Profile
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Quick Actions</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => router.push(`/health/new?resident_id=${record.resident_id}`)}
                        className="flex w-full items-center gap-2 rounded-xl border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
                      >
                        <Heart size={13} className="text-red-500" />
                        Add Another Record
                      </button>
                      <button
                        onClick={() => router.push(`/health/vaccinations/new?resident_id=${record.resident_id}`)}
                        className="flex w-full items-center gap-2 rounded-xl border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
                      >
                        <CalendarDays size={13} className="text-[#3B82F6]" />
                        Add Vaccination
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-[12px] font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={confirmOpen}
      title="Delete Health Record"
      message="This health record will be permanently deleted. This action cannot be undone."
      confirmLabel="Yes, Delete"
      cancelLabel="Cancel"
      variant="danger"
      loading={deleting}
      onConfirm={handleDelete}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}