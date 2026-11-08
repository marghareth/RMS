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
import { ListSummary, ListTabs } from "@/components/shared/ListUI";
import PageHeader from "@/components/shared/PageHeader";
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
import { readList } from "@/lib/fetch-json";
import { useCan } from "@/lib/hooks/useCan";

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
      <div className="min-w-0">
        <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</p>
        <p className="truncate text-[13px] text-[#1F2937] dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OfficialsListPage() {
  const can = useCan();
  const router = useRouter();

  const [officials, setOfficials] = useState<BrgyOfficialMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"SERVING" | "INACTIVE" | "ALL">("SERVING");

  useEffect(() => {
    async function loadOfficials() {
      setLoading(true);
      try {
        // Load every official and filter by tab here, so the tab counts stay accurate.
        const res = await fetch(`/api/officials`);
        setOfficials(await readList(res)); // GET /api/officials returns a bare array
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadOfficials();
  }, []);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(officials[0]?.id ?? null);
  const [deleteTarget, setDeleteTarget] = useState<BrgyOfficialMock | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return officials.filter((o) => {
      if (tab === "SERVING" && !o.is_active) return false;
      if (tab === "INACTIVE" && o.is_active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${residentFullName(o.resident)} ${o.position}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [officials, search, tab]);

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
        subtitle={<span data-tour="page-officials-stats"><ListSummary items={[`${stats.active} serving`, `${stats.total} on record`, stats.captain ? `Punong Barangay: ${residentFullName(stats.captain.resident)}` : "No active Punong Barangay"]} /></span>}
        actions={
          (can("officials:write") && (<button
            data-tour="page-officials-add"
            onClick={() => router.push("/officials/new")}
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
          >
            <Plus size={15} />
            Add Official
          </button>))
        }
      />

      <div className="flex min-h-[calc(100vh-280px)] gap-5">
        {/* ── Left: list panel ── */}
        <div data-tour="page-officials-list" className="flex w-85 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          <div className="border-b border-[#E9EAEC] dark:border-[#262626] px-4 pt-4">
            <div data-tour="page-officials-search" className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search official"
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#737373]"
              />
            </div>
            <div data-tour="page-officials-active">
              <ListTabs
                label="Show officials"
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "SERVING", label: "Serving", count: stats.active },
                  { key: "INACTIVE", label: "Inactive", count: stats.total - stats.active },
                  { key: "ALL", label: "All", count: stats.total },
                ]}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
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
                      active ? "bg-(--brand-tint) shadow-[inset_3px_0_0_var(--brand)] dark:bg-(--brand)/15" : "hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-bold ${active ? "text-(--brand-fg-strong) dark:text-white" : "text-[#1F2937] dark:text-white"}`}>
                        {residentFullName(o.resident)}
                      </p>
                      <p className={`mt-0.5 truncate text-[11px] ${"text-[#4B5563] dark:text-[#A3A3A3]"}`}>
                        {o.position}
                        {o.purok_assignment && o.purok_assignment !== "At-Large" && ` · ${o.purok_assignment}`}
                        {!o.is_active && " · Inactive"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-(--brand-fg)" : "text-[#C4C8CE] dark:text-[#525252]"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div data-tour="page-officials-detail" className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-(--brand-tint) text-xl font-black text-(--brand-fg-strong)">
                    {selected.resident.fname[0]}
                    {selected.resident.lname[0]}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#1F2937] dark:text-white">
                      {residentFullName(selected.resident)}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[13px] text-[#374151] dark:text-[#D4D4D4]">
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
                  {can("officials:write") && (<button
                    onClick={() => setEditId(selected.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12.5px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>)}
                  {can("officials:write") && (<button
                    onClick={() => handleToggleActive(selected)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12.5px] font-semibold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-50"
                  >
                    <Power size={12} />
                    {selected.is_active ? "Deactivate" : "Activate"}
                  </button>)}
                  {can("officials:delete") && (<button
                    onClick={() => setDeleteTarget(selected)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20 hover:text-[#DC2626] dark:hover:text-[#F87171]"
                  >
                    <Trash2 size={14} />
                  </button>)}
                </div>
              </div>

              {/* Resident info */}
              <p className="mb-2 text-[14px] font-semibold text-[#1F2937] dark:text-white">Personal Information</p>
              <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Cake} label="Date of Birth" value={formatISODate(selected.resident.birthdate)} />
                <InfoRow icon={UserCheck} label="Age / Sex" value={`${calcAge(selected.resident.birthdate)} yrs · ${selected.resident.sex}`} />
                <InfoRow icon={Home} label="Current Address" value={selected.resident.household?.address} />
                <InfoRow icon={MapPin} label="Place of Birth" value={selected.resident.place_of_birth} />
                <InfoRow icon={UserCheck} label="Civil Status" value={selected.resident.civil_status.replace("_", "-")} />
                <InfoRow icon={FileText} label="Resident Record" value={`Linked · RBI #${selected.resident.id}`} />
              </div>

              {/* Official info */}
              <p className="mb-2 text-[14px] font-semibold text-[#1F2937] dark:text-white">Official Information</p>
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