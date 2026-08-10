// src/components/health/VaccinationDetailSheet.tsx
//
// The vaccination record detail view, as a slide-over instead of a full
// page navigation. Content mirrors
// (dashboard)/health/vaccinations/[id]/page.tsx (which still exists for
// direct links/bookmarks), just re-homed so it can render inside <Sheet>
// and be driven by a `vaccinationId` prop from the /health list page.
// Mirrors the pattern set by BlotterCaseSheet / RegistryDetailSheet.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Syringe, User, CalendarDays, Trash2, Heart, ExternalLink,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Vaccination {
  id: number;
  vaccine_name: string;
  date_given: string;
  resident: { id: number; fname: string; lname: string; birthdate: string; sex: string; purok?: { name: string } | null };
  recorder: { username: string };
}

interface VaccinationDetailSheetProps {
  /** The vaccination record to show, or null to keep the sheet closed. */
  vaccinationId: number | null;
  onClose: () => void;
  /** Called after a successful deletion, so the list page can refetch. */
  onDeleted?: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-[#F4F5F7] py-2.5 last:border-0">
      <span className="mt-0.5 min-w-27.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</span>
      <span className="text-[13px] font-medium text-[#1F2937]">{value ?? "—"}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function VaccinationDetailSheet({ vaccinationId, onClose, onDeleted }: VaccinationDetailSheetProps) {
  const router = useRouter();
  const open = vaccinationId !== null;

  const [vaccination, setVaccination] = useState<Vaccination | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (vaccinationId !== null && vaccinationId !== syncedId) {
    setSyncedId(vaccinationId);
    setVaccination(null);
    setLoading(true);
    setDeleteError("");
  } else if (vaccinationId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (vaccinationId === null) return;
    let cancelled = false;

    fetch(`/api/health/vaccinations/${vaccinationId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (!cancelled) setVaccination(data); })
      .catch(() => { if (!cancelled) setVaccination(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [vaccinationId]);

  async function handleDelete() {
    if (!vaccination) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/health/vaccinations/${vaccination.id}`, { method: "DELETE" });
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
        {loading || !vaccination ? (
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
                  icon={Syringe}
                  title="Record not found"
                  description="This vaccination record doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]">
                  <Syringe size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <SheetTitle>{vaccination.vaccine_name}</SheetTitle>
                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                    Vaccination Record #{String(vaccination.id).padStart(5, "0")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/health/vaccinations/${vaccination.id}`)}
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

              {/* Vaccine banner */}
              <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-[#EFF6FF] px-5 py-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]">
                  <Syringe size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-[18px] font-black uppercase tracking-wide text-[#1E3A5F]">{vaccination.vaccine_name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-[#3B82F6]" />
                    <p className="text-[12px] font-semibold text-[#3B82F6]">Administered on {fmtDate(vaccination.date_given)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Details */}
                <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Vaccination Details</p>
                  <InfoRow label="Vaccine" value={vaccination.vaccine_name} />
                  <InfoRow
                    label="Date Given"
                    value={
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-[#9CA3AF]" />
                        {fmtDate(vaccination.date_given)}
                      </span>
                    }
                  />
                  <InfoRow label="Recorded By" value={vaccination.recorder.username} />
                  <InfoRow label="Record ID" value={`#${String(vaccination.id).padStart(5, "0")}`} />
                </div>

                {/* Resident */}
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
                        {vaccination.resident.lname}, {vaccination.resident.fname}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{vaccination.resident.purok?.name ?? "—"}</p>
                    </div>
                    <InfoRow label="Age" value={`${calcAge(vaccination.resident.birthdate)} yrs`} />
                    <InfoRow label="Sex" value={vaccination.resident.sex} />
                    <InfoRow label="Birthdate" value={fmtDate(vaccination.resident.birthdate)} />
                    <button
                      onClick={() => router.push(`/residents/${vaccination.resident.id}`)}
                      className="mt-3 w-full rounded-xl bg-[#EFF6FF] py-2 text-[12px] font-bold text-[#3B82F6] transition hover:bg-blue-100"
                    >
                      View Full Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Quick Actions</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => router.push(`/health/vaccinations/new?resident_id=${vaccination.resident.id}`)}
                    className="flex w-full items-center gap-2 rounded-xl border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
                  >
                    <Syringe size={13} className="text-[#3B82F6]" />
                    Add Another Vaccination
                  </button>
                  <button
                    onClick={() => router.push(`/health/new?resident_id=${vaccination.resident.id}`)}
                    className="flex w-full items-center gap-2 rounded-xl border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
                  >
                    <Heart size={13} className="text-red-500" />
                    Add Health Record
                  </button>
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
      title="Delete Vaccination Record"
      message="This vaccination record will be permanently deleted. This action cannot be undone."
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