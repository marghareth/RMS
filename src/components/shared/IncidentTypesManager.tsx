// FILE: src/components/shared/IncidentTypesManager.tsx
//
// Admin-managed list of blotter incident types. Structurally identical to
// the Puroks admin page (src/app/(dashboard)/admin/puroks/page.tsx) —
// inline add / rename / delete, with a "still assigned to N cases" delete
// guard — packaged as a section so it can sit inside admin/settings
// alongside the other configuration cards (spec 2.11).

"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Pencil, Trash2, Check, X, ScrollText, Ban, CheckCircle2 } from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface IncidentType {
  id: number;
  name: string;
  is_active: boolean;
  _count?: { blotter_cases: number };
}

export default function IncidentTypesManager() {
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add-new state
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline-rename state (only one row editable at a time)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete-confirm state
  const [deleteTarget, setDeleteTarget] = useState<IncidentType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/incident-types");
      if (!res.ok) throw new Error("Failed to load incident types");
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load incident types. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: every setState below happens inside a .then()/.catch()/
  // .finally() callback (after the network response), not synchronously
  // inside the effect body — satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/incident-types")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load incident types");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setTypes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load incident types. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/incident-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to add incident types.");
        throw new Error(data.message || data.error || `Failed to add incident type (${res.status}).`);
      }
      setNewName("");
      await loadTypes();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  function startEditing(t: IncidentType) {
    setEditingId(t.id);
    setEditingName(t.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleRename(id: number) {
    const name = editingName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/incident-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to rename incident types.");
        throw new Error(data.message || data.error || `Failed to rename incident type (${res.status}).`);
      }
      cancelEditing();
      await loadTypes();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(t: IncidentType) {
    setError("");
    try {
      const res = await fetch(`/api/incident-types/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to update incident types.");
        throw new Error(data.message || data.error || `Failed to update incident type (${res.status}).`);
      }
      await loadTypes();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/incident-types/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to delete incident types.");
        throw new Error(data.message || data.error || `Failed to delete incident type (${res.status}).`);
      }
      setDeleteTarget(null);
      await loadTypes();
    } catch (e: any) {
      setDeleteError(e.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8FF] dark:bg-violet-500/15">
          <Tag size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
        </div>
        <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Incident Types</p>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-[#9CA3AF] dark:text-[#A3A3A3]">
        Manage the incident type list used when filing blotter cases. Deactivate a type to hide it from
        the filing dropdown without losing history on cases that already use it.
      </p>

      {/* Add new incident type */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New incident type (e.g. Vandalism)"
            className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
        >
          <Plus size={14} />
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/15 px-4 py-2.5 text-[12px] font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-[#E9EAEC] dark:border-[#262626]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7] dark:bg-[#262626]">
              <Tag size={16} className="text-[#D1D5DB] dark:text-[#525252]" />
            </div>
            <p className="text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3]">No incident types yet</p>
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Add your first one above.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 bg-[#F9FAFB] dark:bg-[#171717] px-4 py-2 border-b border-[#E9EAEC] dark:border-[#262626]">
              {["Name", "Cases", "Status", ""].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{h}</span>
              ))}
            </div>

            {types.map((t) => {
              const isEditing = editingId === t.id;
              const inUse = (t._count?.blotter_cases ?? 0) > 0;

              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 border-b border-[#F4F5F7] dark:border-[#262626] px-4 py-3 last:border-0"
                >
                  {/* Name / rename input */}
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(t.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        className="w-full rounded-lg border border-[#3B82F6] dark:border-[#60A5FA] px-2.5 py-1.5 text-[13px] text-[#1F2937] dark:text-white outline-none"
                      />
                    ) : (
                      <p className={`truncate text-[13px] font-semibold ${t.is_active ? "text-[#1F2937] dark:text-white" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>
                        {t.name}
                      </p>
                    )}
                  </div>

                  {/* Case count */}
                  <span className="flex items-center gap-1.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                    <ScrollText size={12} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
                    {t._count?.blotter_cases ?? 0}
                  </span>

                  {/* Status pill */}
                  <span>
                    {t.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-[#A3A3A3]">
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        Inactive
                      </span>
                    )}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleRename(t.id)}
                          disabled={saving || !editingName.trim()}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 dark:text-green-400 transition hover:bg-green-50 disabled:opacity-50"
                          title="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={saving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(t)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                          title={t.is_active ? "Deactivate" : "Activate"}
                        >
                          {t.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                        <button
                          onClick={() => startEditing(t)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(t); setDeleteError(""); }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 dark:text-red-400 transition hover:bg-red-50"
                          title={inUse ? "Still assigned to blotter cases" : "Delete"}
                        >
                          <Trash2 size={14} />
                        </button>
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
        title="Delete Incident Type"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete "${deleteTarget?.name}"? This can't be undone.`
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
      />
    </div>
  );
}