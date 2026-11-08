// FILE: src/components/shared/PickListSelect.tsx
//
// A dropdown whose choices staff can change right where it's used (Nov 2026):
// an "Edit list" link under it opens ListEditorDialog to add, rename or
// delete entries, saved through /api/pick-lists/[list]. Used for revenue
// categories and equipment types (see PICK_LISTS in src/lib/category-lists.ts).
//
// A value saved before its entry was removed from the list still shows as
// a choice, so editing an old record never silently blanks the field.
"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import ListEditorDialog from "@/components/shared/ListEditorDialog";
import { PICK_LISTS, type PickListName } from "@/lib/category-lists";

interface Props {
  list: PickListName;
  value: string;
  onChange: (value: string) => void;
  /** Shown in the dialog, e.g. "Edit revenue categories". */
  dialogTitle: string;
  dialogDescription?: string;
  /** Hide "Edit list" for people who can't change the list. */
  canEdit: boolean;
  /** Text for the empty choice. */
  placeholder?: string;
  className?: string;
  id?: string;
}

export default function PickListSelect({
  list,
  value,
  onChange,
  dialogTitle,
  dialogDescription,
  canEdit,
  placeholder = "— None —",
  className = "",
  id,
}: Props) {
  const defaults = PICK_LISTS[list].defaults as readonly string[];
  const [items, setItems] = useState<string[]>([...defaults]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pick-lists/${list}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) setItems(data.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [list]);

  async function save(next: string[]) {
    const res = await fetch(`/api/pick-lists/${list}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || "Couldn't save the list. Please try again.");
    setItems(data.items);
  }

  const orphan = value && !items.includes(value);

  return (
    <>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        <option value="">{placeholder}</option>
        {items.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
        {orphan && <option value={value}>{value} (not in list)</option>}
      </select>
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-(--brand-fg) transition hover:underline"
        >
          <Pencil size={12} /> Edit list
        </button>
      )}
      <ListEditorDialog
        open={editing}
        title={dialogTitle}
        description={
          dialogDescription ??
          "Add, rename or delete choices. Records already saved keep the name they were saved with."
        }
        items={items}
        defaults={[...defaults]}
        onSave={save}
        onClose={() => setEditing(false)}
      />
    </>
  );
}