// FILE: src/components/meetings/AgendaItemSheet.tsx
//
// Add/Edit Agenda Item side panel. Pass `item={null}` + `meetingId` to
// create a new item, or `item={existingItem}` to edit one.
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { AgendaItemMock, AgendaItemStatus, AGENDA_ITEM_STATUSES } from "@/lib/mock/meetings";

interface AgendaItemSheetProps {
  open: boolean;
  meetingId: number;
  /** null = creating a new item; an item = editing that item */
  item: AgendaItemMock | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AgendaItemSheet({ open, meetingId, item, onClose, onSaved }: AgendaItemSheetProps) {
  const isEdit = item !== null;

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);
  const [status, setStatus] = useState<AgendaItemStatus>(item?.status ?? "PENDING");
  const [minutes, setMinutes] = useState(item?.minutes ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync form fields whenever a different item (or "new") is opened.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const key = open ? (item ? `edit-${item.id}` : "new") : null;
  if (key !== null && key !== syncedKey) {
    setSyncedKey(key);
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setSortOrder(item?.sort_order ?? 0);
    setStatus(item?.status ?? "PENDING");
    setMinutes(item?.minutes ?? "");
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/agenda-items/${item!.id}` : "/api/agenda-items";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        sort_order: sortOrder,
        status,
        minutes: minutes.trim() || null,
      };
      if (!isEdit) body.meeting_id = meetingId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent widthClassName="max-w-md">
        <SheetHeader>
          <div>
            <SheetTitle>{isEdit ? "Edit Agenda Item" : "Add Agenda Item"}</SheetTitle>
          </div>
          <SheetClose />
        </SheetHeader>

        <SheetBody>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder="e.g. Review of Q3 budget utilization"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief context for this agenda item"
                className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[12px] leading-relaxed outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AgendaItemStatus)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                >
                  {AGENDA_ITEM_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Minutes <span className="font-normal normal-case text-[#9CA3AF]">(notes for this item)</span>
              </label>
              <textarea
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                rows={5}
                placeholder="What was discussed or resolved for this item..."
                className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none focus:border-[#3B82F6]"
              />
            </div>

            {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}
          </div>
        </SheetBody>

        <SheetFooter>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            {submitting ? "Saving..." : isEdit ? "Update Item" : "Add Item"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}