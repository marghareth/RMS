"use client";

import { useState } from "react";
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

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_RECORDS: Record<string, HealthRecord> = {
  "1": { id: 1, resident_id: 1, record_type: "Hypertension",       notes: "BP: 140/90. Advised lifestyle changes and medication. Follow-up in 2 weeks. Patient was also advised to reduce salt intake and engage in light physical activity.", recorded_at: "2026-06-25T08:30:00Z", resident: { id: 1, fname: "Juan",   lname: "dela Cruz", birthdate: "1975-03-12", sex: "MALE",   purok: { name: "Purok II"  } }, recorder: { id: 3, username: "bhw_ana"  } },
  "2": { id: 2, resident_id: 2, record_type: "Diabetes",           notes: "Blood sugar: 210 mg/dL. Referred to RHU for further evaluation. Patient is currently on Metformin 500mg twice daily.", recorded_at: "2026-06-22T10:00:00Z", resident: { id: 2, fname: "Maria",  lname: "Santos",    birthdate: "1968-07-22", sex: "FEMALE", purok: { name: "Purok I"   } }, recorder: { id: 3, username: "bhw_ana"  } },
  "3": { id: 3, resident_id: 3, record_type: "Prenatal Checkup",   notes: "28 weeks AOG. Normal fetal heart rate at 144 bpm. Fundic height appropriate. Iron and Folic acid supplements given.", recorded_at: "2026-06-20T09:15:00Z", resident: { id: 3, fname: "Rosa",   lname: "Reyes",     birthdate: "1995-11-05", sex: "FEMALE", purok: { name: "Purok III" } }, recorder: { id: 4, username: "bhw_lena" } },
  "4": { id: 4, resident_id: 4, record_type: "Tuberculosis",       notes: "DOTS therapy started. Month 2 of 6. Patient is compliant with medications. Sputum smear results pending.", recorded_at: "2026-06-18T11:00:00Z", resident: { id: 4, fname: "Pedro",  lname: "Garcia",    birthdate: "1961-09-18", sex: "MALE",   purok: { name: "Purok IV"  } }, recorder: { id: 4, username: "bhw_lena" } },
  "5": { id: 5, resident_id: 5, record_type: "Well-child Checkup", notes: "Growth and development on track. 3 years old. Weight 14kg, Height 96cm. All milestones achieved.", recorded_at: "2026-06-15T08:00:00Z", resident: { id: 5, fname: "Nino",   lname: "Flores",    birthdate: "2023-03-01", sex: "MALE",   purok: { name: "Purok I"   } }, recorder: { id: 3, username: "bhw_ana"  } },
  "6": { id: 6, resident_id: 6, record_type: "Hypertension",       notes: "BP: 150/95. Medications adjusted. Patient advised to monitor BP daily and return if symptomatic.", recorded_at: "2026-06-10T14:00:00Z", resident: { id: 6, fname: "Carmen", lname: "Lopez",     birthdate: "1958-04-30", sex: "FEMALE", purok: { name: "Purok II"  } }, recorder: { id: 4, username: "bhw_lena" } },
  "7": { id: 7, resident_id: 7, record_type: "Asthma",             notes: "Nebulization done in health center. Prescribed Salbutamol inhaler. Patient instructed on proper use and trigger avoidance.", recorded_at: "2026-06-05T09:30:00Z", resident: { id: 7, fname: "Fernando", lname: "Cruz",  birthdate: "1988-12-15", sex: "MALE",   purok: { name: "Purok III" } }, recorder: { id: 3, username: "bhw_ana"  } },
  "8": { id: 8, resident_id: 8, record_type: "Family Planning",    notes: "IUD insertion scheduled next visit. Counseling on various family planning methods completed. Patient chose IUD.", recorded_at: "2026-05-30T10:00:00Z", resident: { id: 8, fname: "Lourdes", lname: "Mendoza", birthdate: "1992-08-20", sex: "FEMALE", purok: { name: "Purok IV"  } }, recorder: { id: 4, username: "bhw_lena" } },
};

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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HealthRecordDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  /* ── Real API (commented out until Supabase is connected) ──────────────────
  const [record,  setRecord]  = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/health/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setRecord)
      .catch(() => router.push("/health"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    // confirm() replaced by ConfirmDialog — see onConfirm handler below
    await fetch(`/api/health/${id}`, { method: "DELETE" });
    router.push("/health");
  }
  ─────────────────────────────────────────────────────────────────────────── */

  // ── Mock data ─────────────────────────────────────────────────────────────
  const record = MOCK_RECORDS[id] ?? MOCK_RECORDS["1"];
  const [deleting,     setDeleting]     = useState(false);
  const [confirmOpen,  setConfirmOpen]  = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await new Promise(r => setTimeout(r, 600));
    router.push("/health");
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