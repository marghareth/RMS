"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Syringe, User, CalendarDays, Trash2, Heart } from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Vaccination {
  id:           number;
  vaccine_name: string;
  date_given:   string;
  resident: { id: number; fname: string; lname: string; birthdate: string; sex: string; purok?: { name: string } | null };
  recorder: { username: string };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-[#F4F5F7] last:border-0">
      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-30 shrink-0 mt-0.5">{label}</span>
      <span className="text-[13px] text-[#1F2937] font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ─── MAIN PAGE (keyed by id so state resets cleanly on navigation) ───────────
export default function VaccinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <VaccinationDetailContent key={id} id={id} />;
}

function VaccinationDetailContent({ id }: { id: string }) {
  const router = useRouter();

  const [vaccination, setVaccination] = useState<Vaccination | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);

  const [deleting,    setDeleting]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/health/vaccinations/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Vaccination) => { if (!cancelled) setVaccination(data); })
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
      const res = await fetch(`/api/health/vaccinations/${id}`, { method: "DELETE" });
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
        Loading vaccination record…
      </div>
    );
  }

  if (!vaccination) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF]">
        Redirecting…
      </div>
    );
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/health")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center">
              <Syringe size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[16px] font-black text-[#1F2937] uppercase tracking-wide">{vaccination.vaccine_name}</h1>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">Vaccination Record #{String(vaccination.id).padStart(5, "0")}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-[12px] text-red-600 font-medium">{deleteError}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left: Vaccination details ── */}
        <div className="col-span-2 space-y-4">

          {/* Vaccine banner */}
          <div className="rounded-xl border border-blue-100 bg-[#EFF6FF] px-5 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#3B82F6] flex items-center justify-center shrink-0">
              <Syringe size={26} className="text-white" />
            </div>
            <div>
              <p className="text-[18px] font-black text-[#1E3A5F] uppercase tracking-wide">{vaccination.vaccine_name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <CalendarDays size={12} className="text-[#3B82F6]" />
                <p className="text-[12px] font-semibold text-[#3B82F6]">
                  Administered on {fmtDate(vaccination.date_given)}
                </p>
              </div>
            </div>
          </div>

          {/* Details card */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-3">Vaccination Details</p>
            <InfoRow label="Vaccine"       value={vaccination.vaccine_name} />
            <InfoRow label="Date Given"    value={
              <span className="flex items-center gap-1.5">
                <CalendarDays size={12} className="text-[#9CA3AF]" />
                {fmtDate(vaccination.date_given)}
              </span>
            } />
            <InfoRow label="Recorded By"  value={vaccination.recorder.username} />
            <InfoRow label="Record ID"    value={`#${String(vaccination.id).padStart(5, "0")}`} />
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
              <div className="flex flex-col items-center text-center mb-4 pt-1">
                <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                  <User size={24} className="text-[#3B82F6]" />
                </div>
                <p className="text-[14px] font-black text-[#1F2937]">
                  {vaccination.resident.lname}, {vaccination.resident.fname}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{vaccination.resident.purok?.name ?? "—"}</p>
              </div>
              <InfoRow label="Age"       value={`${calcAge(vaccination.resident.birthdate)} yrs`} />
              <InfoRow label="Sex"       value={vaccination.resident.sex} />
              <InfoRow label="Birthdate" value={fmtDate(vaccination.resident.birthdate)} />
              <button
                onClick={() => router.push(`/residents/${vaccination.resident.id}`)}
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
                onClick={() => router.push(`/health/vaccinations/new?resident_id=${vaccination.resident.id}`)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
              >
                <Syringe size={13} className="text-[#3B82F6]" />
                Add Another Vaccination
              </button>
              <button
                onClick={() => router.push(`/health/new?resident_id=${vaccination.resident.id}`)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
              >
                <Heart size={13} className="text-red-500" />
                Add Health Record
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Vaccination Record"
        message="This vaccination record will be permanently deleted. This action cannot be undone."
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