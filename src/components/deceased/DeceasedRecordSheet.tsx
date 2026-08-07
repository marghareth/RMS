// FILE: src/components/deceased/DeceasedRecordSheet.tsx
//
// Deceased Record detail/create/edit view, as a slide-over — same
// architecture as VisitorLogSheet / BlotterCaseSheet. `recordId`:
//   - a number  -> fetch and show that record (view mode, with an Edit toggle)
//   - "new"     -> render a blank create form (resident picker required)
//   - null      -> sheet is closed
//
// The linked resident can't be changed once a record exists — only the
// death details (date, causes) are editable after creation.
"use client";

import { useEffect, useState } from "react";
import { User, Calendar, HeartCrack, FileText, Pencil, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ResidentPicker, { PickedResident } from "@/components/shared/ResidentPicker";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface DeceasedResident {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  type_of_resident: string | null;
}

interface DeceasedRecord {
  id: number;
  date_of_death: string;
  immediate_cause: string;
  underlying_cause: string | null;
  created_at: string;
  updated_at: string;
  resident: DeceasedResident;
}

interface FormState {
  date_of_death: string;
  immediate_cause: string;
  underlying_cause: string;
}

const EMPTY_FORM: FormState = { date_of_death: "", immediate_cause: "", underlying_cause: "" };

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fullName(r: DeceasedResident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.fname} ${mi}${r.lname}${ext}`.replace(/\s+/g, " ").trim();
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

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

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface DeceasedRecordSheetProps {
  recordId: number | "new" | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function DeceasedRecordSheet({ recordId, onClose, onSaved }: DeceasedRecordSheetProps) {
  const open = recordId !== null;
  const isNew = recordId === "new";

  const [record, setRecord] = useState<DeceasedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pickedResident, setPickedResident] = useState<PickedResident | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset local state synchronously when the target changes — same
  // render-time-adjustment pattern used by VisitorLogSheet / BlotterCaseSheet.
  const [syncedId, setSyncedId] = useState<number | "new" | null>(null);
  if (recordId !== null && recordId !== syncedId) {
    setSyncedId(recordId);
    setRecord(null);
    setLoading(!isNew);
    setEditing(isNew);
    setForm(EMPTY_FORM);
    setPickedResident(null);
    setFormError(null);
  } else if (recordId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (isNew || recordId === null) return;
    let cancelled = false;

    fetch(`/api/deceased-records/${recordId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: DeceasedRecord) => {
        if (cancelled) return;
        setRecord(data);
        setForm({
          date_of_death: data.date_of_death.slice(0, 10),
          immediate_cause: data.immediate_cause,
          underlying_cause: data.underlying_cause ?? "",
        });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setRecord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [recordId, isNew]);

  async function refetch() {
    if (isNew || recordId === null) return;
    const res = await fetch(`/api/deceased-records/${recordId}`);
    if (res.ok) setRecord(await res.json());
  }

  const canSave = isNew
    ? !!pickedResident && !!form.date_of_death && form.immediate_cause.trim()
    : !!form.date_of_death && form.immediate_cause.trim();

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (isNew) {
        const res = await fetch("/api/deceased-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resident_id: pickedResident!.id,
            date_of_death: form.date_of_death,
            immediate_cause: form.immediate_cause.trim(),
            underlying_cause: form.underlying_cause.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          setFormError(err?.message || "Could not save this record.");
          return;
        }
        onSaved?.();
        onClose();
      } else if (record) {
        await fetch(`/api/deceased-records/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date_of_death: form.date_of_death,
            immediate_cause: form.immediate_cause.trim(),
            underlying_cause: form.underlying_cause.trim() || null,
          }),
        });
        await refetch();
        setEditing(false);
        onSaved?.();
      }
    } catch (e) {
      console.error(e);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    setDeleting(true);
    try {
      await fetch(`/api/deceased-records/${record.id}`, { method: "DELETE" });
      setConfirmDeleteOpen(false);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <SheetContent widthClassName="max-w-lg" className="p-0">
          {!isNew && (loading || !record) ? (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle>{loading ? "Loading record…" : "Record not found"}</SheetTitle>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                  </div>
                ) : (
                  <EmptyState icon={HeartCrack} title="Record not found" description="This entry may have been deleted." />
                )}
              </SheetBody>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <div className="min-w-0">
                  <SheetTitle>
                    {isNew ? "New Deceased Record" : editing ? "Edit Deceased Record" : fullName(record!.resident)}
                  </SheetTitle>
                  {!isNew && !editing && (
                    <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                      Deceased {formatDate(record!.date_of_death)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!isNew && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <SheetClose />
                </div>
              </SheetHeader>

              <SheetBody className="space-y-5">
                {editing ? (
                  <div className="space-y-4">
                    {isNew && (
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                          Resident<span className="text-[#DC2626]"> *</span>
                        </label>
                        <ResidentPicker
                          value={pickedResident}
                          onChange={setPickedResident}
                          placeholder="Search resident by name..."
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Date of Death<span className="text-[#DC2626]"> *</span>
                      </label>
                      <input
                        type="date"
                        value={form.date_of_death}
                        onChange={(e) => setForm((f) => ({ ...f, date_of_death: e.target.value }))}
                        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Immediate Cause<span className="text-[#DC2626]"> *</span>
                      </label>
                      <input
                        value={form.immediate_cause}
                        onChange={(e) => setForm((f) => ({ ...f, immediate_cause: e.target.value }))}
                        placeholder="e.g. Cardiac arrest"
                        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Underlying Cause
                      </label>
                      <input
                        value={form.underlying_cause}
                        onChange={(e) => setForm((f) => ({ ...f, underlying_cause: e.target.value }))}
                        placeholder="e.g. Diabetes mellitus"
                        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                      />
                    </div>

                    {formError && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-[#DC2626]">
                        {formError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Inhabitant Info */}
                    <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                        Inhabitant Info
                      </p>
                      <InfoRow icon={User} label="Name" value={fullName(record!.resident)} />
                      <InfoRow icon={FileText} label="Type of Resident" value={record!.resident.type_of_resident} />
                    </div>

                    {/* Death Info */}
                    <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">
                        Death Info
                      </p>
                      <InfoRow icon={Calendar} label="Date of Death" value={formatDate(record!.date_of_death)} />
                      <InfoRow icon={HeartCrack} label="Immediate Cause" value={record!.immediate_cause} />
                      <InfoRow icon={HeartCrack} label="Underlying Cause" value={record!.underlying_cause} />
                    </div>

                    {/* Metadata */}
                    <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Metadata</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow icon={Calendar} label="Created" value={formatDateTime(record!.created_at)} />
                        <InfoRow icon={Calendar} label="Updated" value={formatDateTime(record!.updated_at)} />
                      </div>
                    </div>
                  </>
                )}
              </SheetBody>

              {editing && (
                <SheetFooter>
                  <div className="flex w-full items-center justify-between gap-2">
                    {!isNew ? (
                      <button
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold text-[#DC2626] transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    ) : <span />}
                    <div className="flex gap-2">
                      <button
                        onClick={() => (isNew ? onClose() : setEditing(false))}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={submitting || !canSave}
                        className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
                      >
                        {submitting ? "Saving…" : isNew ? "Save Record" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </SheetFooter>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete deceased record"
        message={`Are you sure you want to delete this record for "${record ? fullName(record.resident) : ""}"? This will also unmark them as deceased. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}