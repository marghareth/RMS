// FILE: src/components/health/HealthRecordDetailSheet.tsx
//
// The health record detail view, as a slide-over instead of a full page
// navigation. Content mirrors (dashboard)/health/[id]/page.tsx (which
// still exists for direct links/bookmarks), just re-homed so it can
// render inside <Sheet> and be driven by a `recordId` prop from the
// /health list page. Mirrors the pattern set by VaccinationDetailSheet.
//
// REDESIGN (Nov 2026): the header carries the record type and number; the
// body is HealthRecordSummary (patient → notes → follow-up), shared with
// the full page, so no fact is shown twice. The colored type banner,
// "Record Details" card, avatar and "Quick Actions" card are gone.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import HealthRecordSummary, { type HealthRecordForSummary } from "@/components/health/HealthRecordSummary";
import { useCan } from "@/lib/hooks/useCan";

interface HealthRecordDetailSheetProps {
  /** The health record to show, or null to keep the sheet closed. */
  recordId: number | null;
  onClose: () => void;
  /** Called after a successful deletion, so the list page can refetch. */
  onDeleted?: () => void;
}

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white";

export default function HealthRecordDetailSheet({ recordId, onClose, onDeleted }: HealthRecordDetailSheetProps) {
  const can = useCan();
  const router = useRouter();
  const open = recordId !== null;

  const [record, setRecord] = useState<HealthRecordForSummary | null>(null);
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

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || !record ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Record not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
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
              <div className="min-w-0">
                <SheetTitle>{record.record_type}</SheetTitle>
                <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                  Health record <span className="font-mono tabular-nums">#{String(record.id).padStart(5, "0")}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {can("health:write") && (
                  <button onClick={() => router.push(`/health/${record.id}/edit`)} title="Edit" className={ICON_BUTTON}>
                    <Pencil size={15} />
                  </button>
                )}
                <button onClick={() => router.push(`/health/${record.id}`)} title="Open full page" className={ICON_BUTTON}>
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/15 px-4 py-3">
                  <p className="text-[12px] font-medium text-red-600 dark:text-red-400">{deleteError}</p>
                </div>
              )}
              <HealthRecordSummary record={record} canAdd={can("health:write")} />
            </SheetBody>

            {can("health:delete") && (
              <SheetFooter>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete record
                </button>
              </SheetFooter>
            )}
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