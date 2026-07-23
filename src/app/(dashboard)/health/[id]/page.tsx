// FILE PATH: src/app/(dashboard)/health/[id]/page.tsx
// This is the PAGE component. Make sure this — and only this — is what
// lives at that path. The GET/PATCH/DELETE route code belongs in a
// completely different file: src/app/api/health/[id]/route.ts.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Heart, User, CalendarDays,
  Pencil, Trash2, FileText, Clock,
} from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident {
  id: number; fname: string; lname: string;
  birthdate: string; sex: string;
  purok?: { name: string } | null;
}
interface HealthRecord {
  id:          number;
  resident_id: number;
  record_type: string;
  notes:       string | null;
  recorded_at: string;
  resident:    Resident;
  recorder:    { id: number; username: string };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; icon_bg: string }> = {
  "Hypertension":       { bg: "bg-red-50",    text: "text-red-700",    icon_bg: "bg-red-500"    },
  "Diabetes":           { bg: "bg-amber-50",  text: "text-amber-700",  icon_bg: "bg-amber-500"  },
  "Tuberculosis":       { bg: "bg-orange-50", text: "text-orange-700", icon_bg: "bg-orange-500" },
  "Prenatal Checkup":   { bg: "bg-pink-50",   text: "text-pink-700",   icon_bg: "bg-pink-500"   },
  "Well-child Checkup": { bg: "bg-green-50",  text: "text-green-700",  icon_bg: "bg-green-500"  },
  "Asthma":             { bg: "bg-blue-50",   text: "text-blue-700",   icon_bg: "bg-blue-500"   },
  "Family Planning":    { bg: "bg-purple-50", text: "text-purple-700", icon_bg: "bg-purple-500" },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[#F4F5F7] last:border-0">
      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-32.5 shrink-0 mt-0.5">{label}</span>
      <span className="text-[13px] text-[#1F2937] font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ─── MAIN PAGE (keyed by id so state resets cleanly on navigation) ───────────
export default function HealthRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <HealthRecordDetailContent key={id} id={id} />;
}

function HealthRecordDetailContent({ id }: { id: string }) {
  const router = useRouter();

  const [record,   setRecord]   = useState<HealthRecord | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [deleting,    setDeleting]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/health/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: HealthRecord) => { if (!cancelled) setRecord(data); })
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
    } catch (e: any) {
      setDeleteError(e.message || "Something went wrong.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF]">
        Loading health record…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF]">
        Redirecting…
      </div>
    );
  }

  const cfg = TYPE_COLORS[record.record_type] ?? { bg: "bg-gray-50", text: "text-gray-700", icon_bg: "bg-gray-500" };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/health")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon_bg}`}>
              <Heart size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[16px] font-black text-[#1F2937] uppercase tracking-wide">{record.record_type}</h1>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Health Record #{String(record.id).padStart(5, "0")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/health/${id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition disabled:opacity-50"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-[12px] text-red-600 font-medium">{deleteError}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left: Record details ── */}
        <div className="col-span-2 space-y-4">

          {/* Record type banner */}
          <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${cfg.bg} border-current border-opacity-20`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.icon_bg}`}>
              <Heart size={22} className="text-white" />
            </div>
            <div>
              <p className={`text-[16px] font-black uppercase tracking-wide ${cfg.text}`}>{record.record_type}</p>
              <p className={`text-[11px] font-medium mt-0.5 opacity-70 ${cfg.text}`}>
                Recorded on {fmtDateTime(record.recorded_at)} · by {record.recorder.username}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-[#6B7280]" />
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Notes / Findings</p>
            </div>
            {record.notes ? (
              <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{record.notes}</p>
            ) : (
              <p className="text-[13px] text-[#9CA3AF] italic">No notes recorded.</p>
            )}
          </div>

          {/* Meta info */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-3">Record Details</p>
            <InfoRow label="Record ID"   value={`#${String(record.id).padStart(5, "0")}`} />
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

        {/* ── Right: Resident info ── */}
        <div className="space-y-4">

          {/* Resident card */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E9EAEC] bg-[#F9FAFB]">
              <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <User size={13} className="text-white" />
              </div>
              <p className="text-[12px] font-bold text-[#1F2937]">Resident</p>
            </div>
            <div className="p-4">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-4 pt-1">
                <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                  <User size={24} className="text-[#3B82F6]" />
                </div>
                <p className="text-[14px] font-black text-[#1F2937]">
                  {record.resident.lname}, {record.resident.fname}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{record.resident.purok?.name ?? "—"}</p>
              </div>

              <div className="space-y-0">
                <InfoRow label="Age"     value={`${calcAge(record.resident.birthdate)} years old`} />
                <InfoRow label="Sex"     value={record.resident.sex} />
                <InfoRow label="Purok"   value={record.resident.purok?.name} />
                <InfoRow label="Birthdate" value={fmtDate(record.resident.birthdate)} />
              </div>

              <button
                onClick={() => router.push(`/residents/${record.resident_id}`)}
                className="w-full mt-4 py-2 rounded-xl bg-[#EFF6FF] text-[#3B82F6] text-[12px] font-bold hover:bg-blue-100 transition"
              >
                View Full Profile
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/health/new?resident_id=${record.resident_id}`)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
              >
                <Heart size={13} className="text-red-500" />
                Add Another Record
              </button>
              <button
                onClick={() => router.push(`/health/vaccinations/new?resident_id=${record.resident_id}`)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
              >
                <CalendarDays size={13} className="text-[#3B82F6]" />
                Add Vaccination
              </button>
            </div>
          </div>
        </div>
      </div>

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