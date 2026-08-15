// FILE: src/app/(dashboard)/officials/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Search,
  Plus,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  Cake,
  Home,
  Pencil,
  Trash2,
  Power,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import OfficialEditSheet from "@/components/officials/OfficialEditSheet";
import {
  BrgyOfficialMock,
  residentFullName,
  calcAge,
  formatISODate,
  termLabel,
} from "@/lib/mock/officials";

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{label}</p>
        <p className="truncate text-[13px] text-[#1F2937] dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OfficialsListPage() {
  const router = useRouter();

  const [officials, setOfficials] = useState<BrgyOfficialMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    async function loadOfficials() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeOnly) params.set("is_active", "true");
        const res = await fetch(`/api/officials?${params}`);
        setOfficials(await res.json()); // GET /api/officials returns a bare array
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadOfficials();
  }, [activeOnly]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(officials[0]?.id ?? null);
  const [deleteTarget, setDeleteTarget] = useState<BrgyOfficialMock | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return officials.filter((o) => {
      if (activeOnly && !o.is_active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${residentFullName(o.resident)} ${o.position}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [officials, search, activeOnly]);

  const selected = officials.find((o) => o.id === selectedId) ?? null;

  const stats = useMemo(
    () => ({
      total: officials.length,
      active: officials.filter((o) => o.is_active).length,
      kagawad: officials.filter((o) => o.position === "Barangay Kagawad" && o.is_active).length,
      captain: officials.find((o) => o.position === "Punong Barangay" && o.is_active) ?? null,
    }),
    [officials]
  );

  async function handleToggleActive(o: BrgyOfficialMock) {
    setBusy(true);
    try {
      const res = await fetch(`/api/officials/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !o.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update official");
      const updated = await res.json();
      setOfficials((prev) => prev.map((x) => (x.id === o.id ? updated : x)));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/officials/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete official");
      setOfficials((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Barangay Officials"
        subtitle="Directory of elected and appointed officials"
        actions={
          <button
            onClick={() => router.push("/officials/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            <Plus size={15} />
            Add Official
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Officials" value={stats.total} sub="All records" icon={UserCheck} color="blue" />
        <StatCard label="Active" value={stats.active} sub="Currently serving" icon={Power} color="green" />
        <StatCard
          label="Active Captain"
          value={stats.captain ? residentFullName(stats.captain.resident) : "None assigned"}
          sub="Auto-attached as cert. signatory"
          icon={UserCheck}
          color="amber"
        />
      </div>

      <div className="flex min-h-[calc(100vh-280px)] gap-5">
        {/* ── Left: list panel ── */}
        <div className="flex w-85 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          <div className="border-b border-[#E9EAEC] dark:border-[#262626] px-4 pt-4 pb-3">
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search official"
                className="w-full rounded-xl border border-transparent bg-[#F4F5F7] dark:bg-[#262626] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:bg-white dark:focus:bg-[#171717]"
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] dark:text-[#60A5FA] focus:ring-[#3B82F6] dark:focus:ring-[#60A5FA]"
              />
              Active officials only
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No officials found</p>
            ) : (
              filtered.map((o) => {
                const active = selected?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] dark:border-[#262626] px-4 py-3 text-left transition ${
                      active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937] dark:text-white"}`}>
                        {residentFullName(o.resident)}
                      </p>
                      <p className={`mt-0.5 truncate text-[11px] ${active ? "text-blue-100" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>
                        {o.position}
                        {o.purok_assignment && o.purok_assignment !== "At-Large" && ` · ${o.purok_assignment}`}
                        {!o.is_active && " · Inactive"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB] dark:text-[#525252]"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          {!selected ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={UserCheck}
                title="No official selected"
                description="Select an official from the list, or add a new one."
              />
            </div>
          ) : (
            <div className="p-6">
              {/* Header */}
              <div className="mb-5 flex items-start justify-between border-b border-[#E9EAEC] dark:border-[#262626] pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 text-xl font-black text-[#1D4ED8] dark:text-[#93C5FD]">
                    {selected.resident.fname[0]}
                    {selected.resident.lname[0]}
                  </div>
                  <div>
                    <h2 className="text-[16px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
                      {residentFullName(selected.resident)}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
                        {selected.position}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          selected.is_active ? "bg-[#D1FAE5] dark:bg-emerald-500/15 text-[#059669] dark:text-[#34D399]" : "bg-[#F4F5F7] dark:bg-[#262626] text-[#9CA3AF] dark:text-[#A3A3A3]"
                        }`}
                      >
                        {selected.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditId(selected.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(selected)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-50"
                  >
                    <Power size={12} />
                    {selected.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20 hover:text-[#DC2626] dark:hover:text-[#F87171]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Resident info */}
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white">Personal Information</p>
              <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Cake} label="Date of Birth" value={formatISODate(selected.resident.birthdate)} />
                <InfoRow icon={UserCheck} label="Age / Sex" value={`${calcAge(selected.resident.birthdate)} yrs · ${selected.resident.sex}`} />
                <InfoRow icon={Home} label="Current Address" value={selected.resident.household?.address} />
                <InfoRow icon={MapPin} label="Place of Birth" value={selected.resident.place_of_birth} />
                <InfoRow icon={UserCheck} label="Civil Status" value={selected.resident.civil_status.replace("_", "-")} />
                <InfoRow icon={FileText} label="Resident Record" value={`Linked · RBI #${selected.resident.id}`} />
              </div>

              {/* Official info */}
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white">Official Information</p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Phone} label="Contact No." value={selected.contact_no} />
                <InfoRow icon={MapPin} label="Purok Assignment" value={selected.purok_assignment} />
                <InfoRow icon={Calendar} label="Term" value={termLabel(selected)} />
                <InfoRow
                  icon={Calendar}
                  label="Term End"
                  value={selected.term_end ? formatISODate(selected.term_end) : "Ongoing"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this official?"
        message={
          deleteTarget
            ? `${residentFullName(deleteTarget.resident)} will be permanently removed from the officials directory. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <OfficialEditSheet
        officialId={editId}
        onClose={() => setEditId(null)}
        onSaved={(updated) => {
          setOfficials((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        }}
      />
    </div>
  );
}