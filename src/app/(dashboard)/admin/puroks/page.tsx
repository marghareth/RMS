// FILE: src/app/(dashboard)/admin/puroks/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { LIST_CARD, GRID_HEAD, GRID_HEAD_CELL, ListSearch, ListSummary, TextAction } from "@/components/shared/ListUI";
import PageHeader from "@/components/shared/PageHeader";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useCan } from "@/lib/hooks/useCan";
import { duplicateNameProblem } from "@/lib/form-rules";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Purok {
  id: number;
  name: string;
  _count?: { residents: number; households: number };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PuroksAdminPage() {
  const can = useCan();
  const [puroks,  setPuroks]  = useState<Purok[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [search, setSearch] = useState("");

  // Add-new state
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]   = useState(false);

  // Inline-rename state (only one row editable at a time)
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving,       setSaving]      = useState(false);

  // Delete-confirm state
  const [deleteTarget, setDeleteTarget] = useState<Purok | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState("");

  const loadPuroks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/puroks");
      if (!res.ok) throw new Error("Failed to load puroks");
      const data = await res.json();
      setPuroks(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load puroks. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: fetch directly here instead of calling loadPuroks().
  // `loading`/`error` already start correct (true / "") from useState above,
  // so nothing needs to be set synchronously — every setState call below
  // happens inside a .then()/.catch()/.finally() callback, i.e. after the
  // network response comes back, not synchronously inside the effect body.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/puroks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puroks");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setPuroks(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load puroks. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // No two with the same name (src/lib/form-rules.ts).
  const newNameError = duplicateNameProblem(newName, puroks, "Purok");
  const editingNameError = duplicateNameProblem(editingName, puroks, "Purok", editingId);

  async function handleAdd() {
    const name = newName.trim();
    if (!name || newNameError) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/puroks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to add puroks. This requires an administrator account.");
        throw new Error(data.message || data.error || `Failed to add purok (${res.status}).`);
      }
      setNewName("");
      await loadPuroks();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  function startEditing(p: Purok) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleRename(id: number) {
    const name = editingName.trim();
    if (!name || editingNameError) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/puroks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to rename puroks. This requires an administrator account.");
        throw new Error(data.message || data.error || `Failed to rename purok (${res.status}).`);
      }
      cancelEditing();
      await loadPuroks();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/puroks/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to delete puroks. This requires an administrator account.");
        throw new Error(data.message || data.error || `Failed to delete purok (${res.status}).`);
      }
      setDeleteTarget(null);
      await loadPuroks();
    } catch (e: any) {
      setDeleteError(e.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  const totals = useMemo(
    () =>
      puroks.reduce(
        (t, p) => ({ residents: t.residents + (p._count?.residents ?? 0), households: t.households + (p._count?.households ?? 0) }),
        { residents: 0, households: 0 }
      ),
    [puroks]
  );
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? puroks.filter((p) => p.name.toLowerCase().includes(q)) : puroks;
  }, [puroks, search]);

  const ROW = "grid grid-cols-[minmax(0,2fr)_1fr_1fr_minmax(9rem,auto)] items-center gap-4 px-4";

  return (
    <div>
      <PageHeader
        title="Puroks"
        subtitle={
          <ListSummary
            items={[
              `${puroks.length} ${puroks.length === 1 ? "purok" : "puroks"}`,
              `${totals.residents} residents`,
              `${totals.households} households`,
            ]}
          />
        }
        tutorial={ADMIN_TUTORIALS.puroks}
      />

      {error && (
        <p className="mb-3 text-[13px] text-[#DC2626] dark:text-[#F87171]">{error}</p>
      )}

      <div className={LIST_CARD}>
        {/* Toolbar: add a purok on the left, search on the right */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E9EAEC] px-4 py-3 dark:border-[#262626]">
          {can("settings:write") ? (
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:max-w-md">
              <div className="min-w-0 flex-1">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="New purok name, e.g. Purok VI"
                  aria-label="New purok name"
                  className={`w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#737373] ${newNameError ? fieldErrorBorder : ""}`}
                  aria-invalid={!!newNameError}
                />
                <FieldError message={newNameError} />
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim() || !!newNameError}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-(--brand) px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-50"
              >
                <Plus size={14} />
                {adding ? "Adding…" : "Add purok"}
              </button>
            </div>
          ) : (
            <span />
          )}
          <ListSearch value={search} onChange={setSearch} placeholder="Search purok" />
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">Loading puroks…</p>
        ) : puroks.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-medium text-[#374151] dark:text-[#D4D4D4]">No puroks yet</p>
            <p className="mt-0.5 text-[12.5px] text-[#9CA3AF] dark:text-[#A3A3A3]">Add your barangay&apos;s puroks above to get started.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">No purok matches that search.</p>
        ) : (
          <div>
            <div className={`${ROW} py-2.5 ${GRID_HEAD}`}>
              <span className={GRID_HEAD_CELL}>Purok</span>
              <span className={GRID_HEAD_CELL}>Residents</span>
              <span className={GRID_HEAD_CELL}>Households</span>
              <span />
            </div>

            {shown.map((p) => {
              const isEditing = editingId === p.id;
              const residents = p._count?.residents ?? 0;
              const households = p._count?.households ?? 0;
              const inUse = residents > 0 || households > 0;
              const share = totals.residents > 0 ? Math.round((residents / totals.residents) * 100) : 0;

              return (
                <div key={p.id} className={`${ROW} border-b border-[#F4F5F7] py-3 last:border-0 dark:border-[#262626]`}>
                  {/* Name, or the rename box */}
                  <div className="min-w-0">
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(p.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          aria-label={`Rename ${p.name}`}
                          className={`w-full rounded-lg border border-(--brand-line) bg-white px-3 py-1.5 text-[13px] text-[#1F2937] outline-none dark:bg-[#171717] dark:text-white ${editingNameError ? fieldErrorBorder : ""}`}
                          aria-invalid={!!editingNameError}
                        />
                        <FieldError message={editingNameError} />
                      </>
                    ) : (
                      <>
                        <p className="truncate text-[13.5px] font-semibold text-[#1F2937] dark:text-white">{p.name}</p>
                        <p className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                          {inUse ? `${share}% of residents` : "Not used yet"}
                        </p>
                      </>
                    )}
                  </div>

                  <span className="text-[13px] tabular-nums text-[#374151] dark:text-[#D4D4D4]">{residents}</span>
                  <span className="text-[13px] tabular-nums text-[#374151] dark:text-[#D4D4D4]">{households}</span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <TextAction onClick={() => handleRename(p.id)} disabled={saving || !editingName.trim() || !!editingNameError}>
                          {saving ? "Saving…" : "Save"}
                        </TextAction>
                        <TextAction tone="muted" onClick={cancelEditing} disabled={saving}>
                          Cancel
                        </TextAction>
                      </>
                    ) : (
                      <>
                        {can("settings:write") && <TextAction onClick={() => startEditing(p)}>Rename</TextAction>}
                        {can("settings:delete") && (
                          <TextAction
                            tone="danger"
                            title={inUse ? "Still assigned to residents or households" : undefined}
                            onClick={() => {
                              setDeleteTarget(p);
                              setDeleteError("");
                            }}
                          >
                            Delete
                          </TextAction>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete purok"
        message={
          deleteError
            ? deleteError
            : (deleteTarget?._count?.residents ?? 0) + (deleteTarget?._count?.households ?? 0) > 0
              ? `"${deleteTarget?.name}" still has ${deleteTarget?._count?.residents ?? 0} residents and ${deleteTarget?._count?.households ?? 0} households. Move them to another purok first, or the delete will be refused.`
              : `Delete "${deleteTarget?.name}"? This can't be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
      />
    </div>
  );
}