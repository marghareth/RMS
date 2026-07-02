"use client";

import { useMemo, useState } from "react";
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
import {
  MOCK_OFFICIALS,
  BrgyOfficialMock,
  residentFullName,
  calcAge,
  formatISODate,
  termLabel,
} from "@/lib/mock/officials";

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <p className="truncate text-[13px] text-[#1F2937]">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OfficialsListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [officials, setOfficials] = useState<BrgyOfficialMock[]>(MOCK_OFFICIALS);
  const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [officials, setOfficials] = useState<BrgyOfficialMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadOfficials() {
  //     setLoading(true);
  //     try {
  //       const params = new URLSearchParams();
  //       if (activeOnly) params.set("is_active", "true");
  //       const res = await fetch(`/api/officials?${params}`);
  //       setOfficials(await res.json()); // GET /api/officials returns a bare array
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadOfficials();
  // }, [activeOnly]);

  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(officials[0]?.id ?? null);
  const [deleteTarget, setDeleteTarget] = useState<BrgyOfficialMock | null>(null);
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

  // ── MOCK: toggle active status ───────────────────────────────────────────
  async function handleToggleActive(o: BrgyOfficialMock) {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    setOfficials((prev) => prev.map((x) => (x.id === o.id ? { ...x, is_active: !x.is_active } : x)));
    setBusy(false);

    // ── REAL WRITE (disabled until API/DB is wired up) ─────────────────
    // await fetch(`/api/officials/${o.id}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ is_active: !o.is_active }),
    // });
    // await loadOfficials();
  }

  // ── MOCK: delete official ────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    setOfficials((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setBusy(false);
    setDeleteTarget(null);

    // ── REAL WRITE (disabled until API/DB is wired up) ─────────────────
    // await fetch(`/api/officials/${deleteTarget.id}`, { method: "DELETE" });
    // await loadOfficials();
  }

  return (
    <div>
      <PageHeader
        title="Barangay Officials"
        subtitle="Directory of elected and appointed officials"
        actions={
          <button
            onClick={() => router.push("/officials/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
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
        <div className="flex w-85 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
          <div className="border-b border-[#E9EAEC] px-4 pt-4 pb-3">
            <div className="relative mb-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search official"
                className="w-full rounded-xl border border-transparent bg-[#F4F5F7] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white"
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280]">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Active officials only
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-[12px] text-[#9CA3AF]">No officials found</p>
            ) : (
              filtered.map((o) => {
                const active = selected?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] px-4 py-3 text-left transition ${
                      active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937]"}`}>
                        {residentFullName(o.resident)}
                      </p>
                      <p className={`mt-0.5 truncate text-[11px] ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                        {o.position}
                        {o.purok_assignment && o.purok_assignment !== "At-Large" && ` · ${o.purok_assignment}`}
                        {!o.is_active && " · Inactive"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white">
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
              <div className="mb-5 flex items-start justify-between border-b border-[#E9EAEC] pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] text-xl font-black text-[#1D4ED8]">
                    {selected.resident.fname[0]}
                    {selected.resident.lname[0]}
                  </div>
                  <div>
                    <h2 className="text-[16px] font-black uppercase tracking-wide text-[#1F2937]">
                      {residentFullName(selected.resident)}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                        {selected.position}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          selected.is_active ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#F4F5F7] text-[#9CA3AF]"
                        }`}
                      >
                        {selected.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/officials/${selected.id}/edit`)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#374151] transition hover:bg-[#F4F5F7]"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(selected)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#374151] transition hover:bg-[#F4F5F7] disabled:opacity-50"
                  >
                    <Power size={12} />
                    {selected.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Resident info */}
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Personal Information</p>
              <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Cake} label="Date of Birth" value={formatISODate(selected.resident.birthdate)} />
                <InfoRow icon={UserCheck} label="Age / Sex" value={`${calcAge(selected.resident.birthdate)} yrs · ${selected.resident.sex}`} />
                <InfoRow icon={Home} label="Current Address" value={selected.resident.address} />
                <InfoRow icon={MapPin} label="Place of Birth" value={selected.resident.place_of_birth} />
                <InfoRow icon={UserCheck} label="Civil Status" value={selected.resident.civil_status.replace("_", "-")} />
                <InfoRow icon={FileText} label="Resident Record" value={`Linked · RBI #${selected.resident.id}`} />
              </div>

              {/* Official info */}
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Official Information</p>
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
        confirmLabel={busy ? "Removing..." : "Remove"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}