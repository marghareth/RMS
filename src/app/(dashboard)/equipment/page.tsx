// FILE: src/app/(dashboard)/equipment/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Package, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, Clock,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type EquipmentStatus = "SERVICEABLE" | "UNSERVICEABLE" | "MISSING";

interface Borrowing {
  id: number;
  borrower_name: string;
  date_borrowed: string;
  expected_return: string;
  actual_return: string | null;
  is_overdue: boolean;
}

interface Equipment {
  id: number;
  name: string;
  quantity: number;
  condition: string | null;
  status: EquipmentStatus;
  date_acquired: string | null;
  borrowings: Borrowing[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<EquipmentStatus, {
  label: string;
  bg: string;
  text: string;
  icon: React.FC<{ size?: number }>;
}> = {
  SERVICEABLE:   { label: "Serviceable",   bg: "bg-green-100",  text: "text-green-700",  icon: CheckCircle2    },
  UNSERVICEABLE: { label: "Unserviceable", bg: "bg-amber-100",  text: "text-amber-700",  icon: AlertTriangle   },
  MISSING:       { label: "Missing",       bg: "bg-red-100",    text: "text-red-700",    icon: XCircle         },
};

function activeBorrowings(eq: Equipment) {
  return eq.borrowings.filter(b => !b.actual_return);
}
function hasOverdue(eq: Equipment) {
  return eq.borrowings.some(b => !b.actual_return && b.is_overdue);
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] px-5 py-4">
      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-[26px] font-black leading-none ${accent ?? "text-[#1F2937]"}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#9CA3AF] mt-1">{sub}</p>}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EquipmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const router = useRouter();

  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState<EquipmentStatus | "ALL">("ALL");
  const [selectedId,    setSelectedId]    = useState<number | null>(null);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Reset to a "loading" state the instant search/filterStatus change,
  // during render rather than inside the effect below — same
  // render-time-reset pattern used on the certificate preview page, exempt
  // from the set-state-in-effect rule because it isn't inside useEffect.
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const queryKey = `${search}|${filterStatus}`;
  const [loadedKey, setLoadedKey] = useState(queryKey);
  if (queryKey !== loadedKey) {
    setLoadedKey(queryKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search)                          params.set("search", search);
    if (filterStatus !== "ALL")          params.set("status", filterStatus);
    fetch(`/api/equipment?${params}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setEquipment(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, filterStatus]);

  // Derived rather than stored: falls back to the first item once real data
  // has loaded, without needing an effect (and its own setState-in-effect
  // pitfall) just to "auto-select the first row".
  const selected = equipment.find(e => e.id === selectedId) ?? equipment[0] ?? null;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalItems      = equipment.length;
  const serviceable     = equipment.filter(e => e.status === "SERVICEABLE").length;
  const currentlyOut    = equipment.reduce((n, e) => n + activeBorrowings(e).length, 0);
  const overdueCount    = equipment.filter(hasOverdue).length;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2937] uppercase tracking-wide">Inventory</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">Equipment management and borrow tracking</p>
        </div>
        <button
          onClick={() => router.push("/equipment/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition shadow-sm"
        >
          <Plus size={15} />
          Add Equipment
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Equipment"   value={totalItems}   sub="item types"                />
        <StatCard label="Serviceable"       value={serviceable}  sub="ready for use"  accent="text-green-600" />
        <StatCard label="Currently Borrowed" value={currentlyOut} sub="active borrows" accent="text-[#3B82F6]" />
        <StatCard label="Overdue"           value={overdueCount} sub="past return date" accent="text-red-500" />
      </div>

      {/* ── Main panel ── */}
      <div className="flex gap-5 min-h-125">

        {/* Left list */}
        <div className="bg-white rounded-xl border border-[#E9EAEC] flex flex-col w-85 shrink-0 overflow-hidden">

          {/* Search + filter */}
          <div className="px-4 pt-4 pb-3 space-y-2 border-b border-[#E9EAEC]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search equipment..."
                className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-[#F4F5F7] rounded-xl border border-transparent focus:outline-none focus:border-[#3B82F6] focus:bg-white transition placeholder:text-[#9CA3AF]"
              />
            </div>
            {/* Status filter tabs */}
            <div className="flex gap-1">
              {(["ALL", "SERVICEABLE", "UNSERVICEABLE", "MISSING"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg uppercase tracking-wide transition
                    ${filterStatus === s
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#F4F5F7] text-[#6B7280] hover:bg-[#E5E7EB]"}`}
                >
                  {s === "ALL" ? "All" : s === "SERVICEABLE" ? "OK" : s === "UNSERVICEABLE" ? "Broken" : "Missing"}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
              </div>
            ) : equipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Package size={28} className="text-[#D1D5DB]" />
                <p className="text-[12px] text-[#9CA3AF]">No equipment found</p>
              </div>
            ) : (
              equipment.map(eq => {
                const active  = selected?.id === eq.id;
                const out     = activeBorrowings(eq).length;
                const overdue = hasOverdue(eq);
                return (
                  <button
                    key={eq.id}
                    onClick={() => setSelectedId(eq.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[#F4F5F7] transition
                      ${active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"}`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${active ? "bg-blue-400" : "bg-[#F4F5F7]"}`}>
                      <Package size={16} className={active ? "text-white" : "text-[#9CA3AF]"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold truncate ${active ? "text-white" : "text-[#1F2937]"}`}>
                        {eq.name}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                        Qty: {eq.quantity}
                        {out > 0 && ` · ${out} borrowed`}
                        {overdue && " · ⚠ overdue"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
                  </button>
                );
              })
            )}
          </div>

          {/* Quick link to borrowed items */}
          <div className="p-3 border-t border-[#F4F5F7]">
            <button
              onClick={() => router.push("/equipment/borrow")}
              className="w-full py-2 rounded-xl text-[12px] font-bold text-[#3B82F6] bg-blue-50 hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
            >
              <Clock size={13} />
              View All Borrowed Items
            </button>
          </div>
        </div>

        {/* Right detail panel */}
        {selected ? (
          <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] overflow-y-auto p-6">

            {/* Header */}
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#E9EAEC]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F4F5F7] flex items-center justify-center">
                  <Package size={22} className="text-[#6B7280]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-[#1F2937] uppercase tracking-wide">{selected.name}</h2>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Equipment ID: #{String(selected.id).padStart(5, "0")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/equipment/${selected.id}/edit`)}
                  className="px-3 py-1.5 rounded-lg border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => router.push(`/equipment/${selected.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition"
                >
                  Full Details
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
              {[
                ["Status",         <StatusBadge key="s" status={selected.status} />],
                ["Quantity",       <span key="q" className="text-[13px] font-bold text-[#1F2937]">{selected.quantity} pcs</span>],
                ["Condition",      <span key="c" className="text-[13px] text-[#374151]">{selected.condition ?? "—"}</span>],
                ["Date Acquired",  <span key="d" className="text-[13px] text-[#374151]">
                  {selected.date_acquired
                    ? new Date(selected.date_acquired).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "—"}
                </span>],
                ["Currently Out",  <span key="o" className={`text-[13px] font-bold ${activeBorrowings(selected).length > 0 ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>
                  {activeBorrowings(selected).length} unit(s)
                </span>],
                ["Overdue",        <span key="ov" className={`text-[13px] font-bold ${hasOverdue(selected) ? "text-red-500" : "text-[#9CA3AF]"}`}>
                  {hasOverdue(selected) ? "Yes — action needed" : "None"}
                </span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-27.5 shrink-0">{label}</span>
                  <span>: </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>

            {/* Active borrowings */}
            <div className="border-t border-[#E9EAEC] pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">
                  Currently Borrowed
                </p>
                <button
                  onClick={() => router.push(`/equipment/borrow?equipment_id=${selected.id}`)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
                >
                  <Plus size={12} />
                  Lend out
                </button>
              </div>

              {activeBorrowings(selected).length === 0 ? (
                <div className="flex items-center justify-center py-8 rounded-xl bg-[#F9FAFB] border border-[#F4F5F7]">
                  <p className="text-[12px] text-[#9CA3AF]">No active borrowings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBorrowings(selected).map(b => (
                    <div
                      key={b.id}
                      className={`rounded-xl border px-4 py-3 flex items-center justify-between
                        ${b.is_overdue ? "border-red-200 bg-red-50" : "border-[#E9EAEC] bg-white"}`}
                    >
                      <div>
                        <p className="text-[13px] font-bold text-[#1F2937]">{b.borrower_name}</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          Borrowed: {new Date(b.date_borrowed).toLocaleDateString()}
                          {" · "}
                          Due: {new Date(b.expected_return).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-600 uppercase">
                            Overdue
                          </span>
                        )}
                        <button
                          onClick={() => router.push(`/equipment/return?borrowing_id=${b.id}`)}
                          className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition uppercase tracking-wide"
                        >
                          Return
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-[#E9EAEC] flex gap-2">
              <button
                onClick={() => router.push(`/equipment/borrow?equipment_id=${selected.id}`)}
                className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold transition"
              >
                Lend Out
              </button>
              <button
                onClick={() => router.push(`/equipment/${selected.id}`)}
                className="flex-1 py-2.5 rounded-xl border border-[#E9EAEC] text-[#6B7280] text-[13px] font-bold hover:bg-[#F4F5F7] transition"
              >
                View Borrow History
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] flex items-center justify-center">
            <div className="text-center">
              <Package size={36} className="text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-[13px] text-[#9CA3AF]">Select an item to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}