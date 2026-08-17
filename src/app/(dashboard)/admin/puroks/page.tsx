// FILE: src/app/(dashboard)/admin/puroks/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Pencil, Trash2, Check, X, Users, Home } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Purok {
  id: number;
  name: string;
  _count?: { residents: number; households: number };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PuroksAdminPage() {
  const [puroks,  setPuroks]  = useState<Purok[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

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

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
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
    if (!name) return;
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

  return (
    <div>
      <PageHeader
        title="Puroks"
        subtitle="Manage the puroks / zones used across residents, households, and filters."
      />

      {/* Add new purok */}
      <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#333333] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-4 mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New purok name (e.g. Purok 5)"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#E9EAEC] dark:border-[#333333] rounded-xl focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA] placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] text-[#1F2937] dark:text-white transition"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] text-white text-[12px] font-bold transition shadow-sm disabled:opacity-50 shrink-0"
        >
          <Plus size={14} />
          {adding ? "Adding…" : "Add Purok"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-[12px] font-medium">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#333333] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : puroks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F4F5F7] dark:bg-[#262626] flex items-center justify-center">
              <MapPin size={20} className="text-[#D1D5DB] dark:text-[#525252]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#6B7280] dark:text-[#A3A3A3]">No puroks yet</p>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-0.5">Add your barangay&apos;s puroks above to get started</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-[#F9FAFB] dark:bg-[#171717] border-b border-[#E9EAEC] dark:border-[#333333]">
              {["Name", "Residents", "Households", ""].map((h) => (
                <span key={h} className="text-[10px] font-bold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {puroks.map((p) => {
              const isEditing = editingId === p.id;
              const inUse = (p._count?.residents ?? 0) > 0 || (p._count?.households ?? 0) > 0;

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center border-b border-[#F4F5F7] dark:border-[#262626] last:border-0"
                >
                  {/* Name / rename input */}
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(p.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        className="w-full text-[13px] border border-[#3B82F6] dark:border-[#60A5FA] rounded-lg px-3 py-1.5 focus:outline-none text-[#1F2937] dark:text-white"
                      />
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                          <MapPin size={14} className="text-[#3B82F6] dark:text-[#60A5FA]" />
                        </div>
                        <p className="text-[13px] font-bold text-[#1F2937] dark:text-white truncate">{p.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Resident count */}
                  <span className="flex items-center gap-1.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                    <Users size={13} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
                    {p._count?.residents ?? 0}
                  </span>

                  {/* Household count */}
                  <span className="flex items-center gap-1.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                    <Home size={13} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
                    {p._count?.households ?? 0}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleRename(p.id)}
                          disabled={saving || !editingName.trim()}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 transition disabled:opacity-50"
                          title="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={saving}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(p); setDeleteError(""); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 transition"
                          title={inUse ? "Still assigned to residents or households" : "Delete"}
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
        title="Delete Purok"
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