// FILE: src/components/visitors/VisitorLogSheet.tsx
//
// Visitor Log detail/create/edit view, as a slide-over — same architecture
// as BlotterCaseSheet. `visitorId`:
//   - a number  -> fetch and show that entry (view mode, with an Edit toggle)
//   - "new"     -> render a blank create form immediately, no fetch
//   - null      -> sheet is closed
"use client";

import { useEffect, useState } from "react";
import {
  User, Phone, FileText, UserRound, Clock, LogOut, Pencil, Trash2, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface VisitorLog {
  id: number;
  visitor_name: string;
  contact: string | null;
  purpose: string;
  person_to_visit: string | null;
  time_in: string;
  time_out: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  visitor_name: string;
  contact: string;
  purpose: string;
  person_to_visit: string;
}

const EMPTY_FORM: FormState = { visitor_name: "", contact: "", purpose: "", person_to_visit: "" };

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{label}</p>
        <p className="text-[13px] text-[#1F2937] dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, required, textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
        {label}{required && <span className="text-[#DC2626] dark:text-[#F87171]"> *</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
        />
      )}
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface VisitorLogSheetProps {
  visitorId: number | "new" | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function VisitorLogSheet({ visitorId, onClose, onSaved }: VisitorLogSheetProps) {
  const open = visitorId !== null;
  const isNew = visitorId === "new";

  const [visitor, setVisitor] = useState<VisitorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset local state synchronously when the target changes, following the
  // same render-time-adjustment pattern as BlotterCaseSheet — avoids the
  // react-hooks/set-state-in-effect lint rule and an extra render.
  const [syncedId, setSyncedId] = useState<number | "new" | null>(null);
  if (visitorId !== null && visitorId !== syncedId) {
    setSyncedId(visitorId);
    setVisitor(null);
    setLoading(!isNew);
    setEditing(isNew);
    setForm(EMPTY_FORM);
  } else if (visitorId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (isNew || visitorId === null) return;
    let cancelled = false;

    fetch(`/api/visitor-logs/${visitorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: VisitorLog) => {
        if (cancelled) return;
        setVisitor(data);
        setForm({
          visitor_name: data.visitor_name,
          contact: data.contact ?? "",
          purpose: data.purpose,
          person_to_visit: data.person_to_visit ?? "",
        });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setVisitor(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [visitorId, isNew]);

  async function refetch() {
    if (isNew || visitorId === null) return;
    const res = await fetch(`/api/visitor-logs/${visitorId}`);
    if (res.ok) setVisitor(await res.json());
  }

  const canSave = form.visitor_name.trim() && form.purpose.trim();

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const payload = {
        visitor_name: form.visitor_name.trim(),
        contact: form.contact.trim() || null,
        purpose: form.purpose.trim(),
        person_to_visit: form.person_to_visit.trim() || null,
      };

      if (isNew) {
        await fetch("/api/visitor-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSaved?.();
        onClose();
      } else if (visitor) {
        await fetch(`/api/visitor-logs/${visitor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await refetch();
        setEditing(false);
        onSaved?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!visitor) return;
    setCheckingOut(true);
    try {
      await fetch(`/api/visitor-logs/${visitor.id}/checkout`, { method: "POST" });
      await refetch();
      onSaved?.();
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleDelete() {
    if (!visitor) return;
    setDeleting(true);
    try {
      await fetch(`/api/visitor-logs/${visitor.id}`, { method: "DELETE" });
      setConfirmDeleteOpen(false);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  const isActive = !!visitor && !visitor.time_out;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <SheetContent widthClassName="max-w-lg" className="p-0">
          {!isNew && (loading || !visitor) ? (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle>{loading ? "Loading visitor…" : "Visitor not found"}</SheetTitle>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                {loading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
                  </div>
                ) : (
                  <EmptyState icon={User} title="Visitor not found" description="This entry may have been deleted." />
                )}
              </SheetBody>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <div className="min-w-0">
                  <SheetTitle>
                    {isNew ? "New Visitor" : editing ? "Edit Visitor" : visitor!.visitor_name}
                  </SheetTitle>
                  {!isNew && !editing && (
                    <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                      {isActive ? "Currently checked in" : `Checked out ${formatDateTime(visitor!.time_out)}`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!isNew && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <SheetClose />
                </div>
              </SheetHeader>

              <SheetBody className="space-y-5">
                {editing ? (
                  <div className="space-y-3">
                    <FormField
                      label="Visitor Name"
                      required
                      value={form.visitor_name}
                      onChange={(v) => setForm((f) => ({ ...f, visitor_name: v }))}
                      placeholder="Juan Dela Cruz"
                    />
                    <FormField
                      label="Contact"
                      value={form.contact}
                      onChange={(v) => setForm((f) => ({ ...f, contact: v }))}
                      placeholder="09XX XXX XXXX"
                    />
                    <FormField
                      label="Purpose"
                      required
                      value={form.purpose}
                      onChange={(v) => setForm((f) => ({ ...f, purpose: v }))}
                      placeholder="e.g. Certificate request"
                      textarea
                    />
                    <FormField
                      label="Person / Office to Visit"
                      value={form.person_to_visit}
                      onChange={(v) => setForm((f) => ({ ...f, person_to_visit: v }))}
                      placeholder="e.g. Barangay Secretary"
                    />
                  </div>
                ) : (
                  <>
                    {/* Visitor Info */}
                    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
                        Visitor Info
                      </p>
                      <InfoRow icon={User} label="Name" value={visitor!.visitor_name} />
                      <InfoRow icon={Phone} label="Contact" value={visitor!.contact} />
                      <InfoRow icon={FileText} label="Purpose" value={visitor!.purpose} />
                      <InfoRow icon={UserRound} label="Person to Visit" value={visitor!.person_to_visit} />
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Timeline</p>
                        {isActive && <StatusBadge status="ACTIVE" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow icon={Clock} label="Time In" value={formatDateTime(visitor!.time_in)} />
                        <InfoRow icon={Clock} label="Time Out" value={formatDateTime(visitor!.time_out)} />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Metadata</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoRow icon={Clock} label="Created" value={formatDateTime(visitor!.created_at)} />
                        <InfoRow icon={Clock} label="Updated" value={formatDateTime(visitor!.updated_at)} />
                      </div>
                    </div>
                  </>
                )}
              </SheetBody>

              <SheetFooter className={editing ? "" : isActive ? "" : "hidden"}>
                {editing ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    {!isNew ? (
                      <button
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold text-[#DC2626] dark:text-[#F87171] transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    ) : <span />}
                    <div className="flex gap-2">
                      <button
                        onClick={() => (isNew ? onClose() : setEditing(false))}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-4 py-2.5 text-[12px] font-bold text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={submitting || !canSave}
                        className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
                      >
                        {submitting ? "Saving…" : isNew ? "Check In Visitor" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#D97706] dark:hover:bg-[#F59E0B] disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    {checkingOut ? "Checking out…" : "Check Out"}
                  </button>
                )}
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete visitor entry"
        message={`Are you sure you want to delete the log entry for "${visitor?.visitor_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}