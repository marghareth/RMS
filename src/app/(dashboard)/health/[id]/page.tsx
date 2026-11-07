// FILE: src/app/(dashboard)/health/[id]/page.tsx
//
// This is the PAGE component. The GET/PATCH/DELETE route code belongs in a
// completely different file: src/app/api/health/[id]/route.ts.
//
// REDESIGN (Nov 2026): the header carries the record type and number with
// Edit / Delete; the body is HealthRecordSummary (patient → notes →
// follow-up), shared with the slide-over, so no fact is shown twice. The
// guided-tour targets (page-health-detail-*) are kept on the new layout.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import HealthRecordSummary, { type HealthRecordForSummary } from "@/components/health/HealthRecordSummary";
import { useCan } from "@/lib/hooks/useCan";

// ─── MAIN PAGE (keyed by id so state resets cleanly on navigation) ───────────
export default function HealthRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <HealthRecordDetailContent key={id} id={id} />;
}

function HealthRecordDetailContent({ id }: { id: string }) {
  const can = useCan();
  const router = useRouter();

  const [record,   setRecord]   = useState<HealthRecordForSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [deleting,    setDeleting]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/health/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: HealthRecordForSummary) => { if (!cancelled) setRecord(data); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (notFound) router.push("/health");
  }, [notFound, router]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/health/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      router.push("/health");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Something went wrong.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
        Loading health record…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.push("/health")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Health Records
      </button>

      {/* ── Page header ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight text-[#1F2937] dark:text-white">{record.record_type}</h1>
          <p className="mt-1 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            Health record <span className="font-mono tabular-nums">#{String(record.id).padStart(5, "0")}</span>
          </p>
        </div>
        <div data-tour="page-health-detail-actions" className="flex gap-2">
          {can("health:write") && (<button
            onClick={() => router.push(`/health/${id}/edit`)}
            className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] px-4 py-2 text-[12.5px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          >
            <Pencil size={14} /> Edit
          </button>)}
          {can("health:delete") && (<button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>)}
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/15 px-4 py-3">
          <p className="text-[12px] font-medium text-red-600 dark:text-red-400">{deleteError}</p>
        </div>
      )}

      <HealthRecordSummary record={record} canAdd={can("health:write")} />

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
    </div>
  );
}