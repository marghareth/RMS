// FILE: src/components/shared/ListEditorDialog.tsx
//
// A small dialog for editing a pick-list right where it's used (Nov 2026)
// — e.g. the Income/Expense categories on Add Transaction, or the PS/MOOE/
// CO sub-categories on Appropriations — so staff don't have to go to
// Admin → Settings. Rename an entry by typing over it, remove it with ×,
// add new ones at the bottom. Nothing is saved until Save.
"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { ITEM_MAX_LENGTH, LIST_MAX_ITEMS } from "@/lib/category-lists";

interface Props {
  open: boolean;
  title: string;
  /** One or two sentences under the title: what the list is for. */
  description?: string;
  items: string[];
  /** Offered as "Restore defaults". */
  defaults?: string[];
  /** Saves the list. Throw an Error with a readable message to show it. */
  onSave: (items: string[]) => Promise<void>;
  onClose: () => void;
}

type Row = { id: number; text: string };

let nextId = 1;
const toRows = (items: string[]): Row[] => items.map((text) => ({ id: nextId++, text }));

export default function ListEditorDialog({ open, title, description, items, defaults, onSave, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  // Start from the current list every time the dialog opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setRows(toRows(items));
    setNewItem("");
    setError("");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    if (rows.some((r) => r.text.trim().toLowerCase() === text.toLowerCase())) {
      setError(`"${text}" is already in the list.`);
      return;
    }
    if (rows.length >= LIST_MAX_ITEMS) {
      setError(`A list can have at most ${LIST_MAX_ITEMS} entries.`);
      return;
    }
    setRows((r) => [...r, { id: nextId++, text }]);
    setNewItem("");
    setError("");
    addRef.current?.focus();
  }

  async function save() {
    // Include whatever is still typed in the "add" box.
    const list = [...rows.map((r) => r.text), newItem].map((t) => t.trim()).filter(Boolean);
    if (list.length === 0) {
      setError("Keep at least one entry in the list.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(list);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the list. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#E9EAEC] bg-white shadow-lg dark:border-[#333333] dark:bg-[#171717]">
        <div className="border-b border-[#E9EAEC] px-5 py-4 dark:border-[#333333]">
          <p className="text-[15px] font-semibold text-[#1F2937] dark:text-white">{title}</p>
          {description && <p className="mt-1 text-[12.5px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">{description}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <input
                  value={row.text}
                  maxLength={ITEM_MAX_LENGTH}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)))}
                  aria-label="Entry name"
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#1F2937] outline-none transition hover:border-[#E9EAEC] focus:border-(--brand-line) focus:bg-white dark:bg-[#1F1F1F] dark:text-white dark:hover:border-[#333333] dark:focus:bg-[#171717]"
                />
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                  aria-label={`Remove ${row.text}`}
                  title="Remove"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-2 border-t border-[#F0F1F3] pt-3 dark:border-[#262626]">
            <input
              ref={addRef}
              value={newItem}
              maxLength={ITEM_MAX_LENGTH}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Add a new one…"
              className="min-w-0 flex-1 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[13px] outline-none focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white"
            />
            <button
              type="button"
              onClick={addItem}
              disabled={!newItem.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12.5px] font-semibold text-[#374151] transition hover:bg-[#F4F5F7] disabled:opacity-40 dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {error && <p className="mt-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-[#E9EAEC] px-5 py-3.5 dark:border-[#333333]">
          {defaults && (
            <button
              type="button"
              onClick={() => {
                setRows(toRows(defaults));
                setError("");
              }}
              disabled={saving}
              className="text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white"
            >
              Restore defaults
            </button>
          )}
          <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#E9EAEC] px-4 py-2 text-[12.5px] font-semibold text-[#374151] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-(--brand) px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save list"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}