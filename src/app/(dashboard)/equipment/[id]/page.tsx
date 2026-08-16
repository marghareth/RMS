// FILE: src/app/(dashboard)/equipment/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Package, Pencil, Clock,
  CheckCircle2, AlertTriangle, XCircle,
  CalendarDays, Hash, Layers, Wrench,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type EquipmentStatus = "SERVICEABLE" | "UNSERVICEABLE" | "MISSING";

interface Borrowing {
  id: number;
  borrower_name: string;
  date_borrowed: string;
  expected_return: string;
  actual_return: string | null;
  return_condition: string | null;
  is_overdue: boolean;
  resident?: { fname: string; lname: string } | null;
  recorder?: { username: string } | null;
}

interface Equipment {
  id: number;
  name: string;
  quantity: number;
  condition: string | null;
  status: EquipmentStatus;
  date_acquired: string | null;
  created_at: string;
  image_url: string | null;
  serial_number: string | null;
  purchase_cost: number | string | null;
  current_value: number | string | null;
  purchase_date: string | null;
  assigned_to: string | null;
  location: string | null;
  description: string | null;
  asset_type: string | null;
  borrowings: Borrowing[];
}

const CONDITION_LABELS: Record<string, string> = {
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  NEEDS_REPAIR: "Needs Repair",
  DECOMMISSIONED: "Decommissioned",
};

function fmtCurrency(value: number | string | null | undefined) {
  const n = value === null || value === undefined ? 0 : Number(value);
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<EquipmentStatus, { label: string; bg: string; text: string; dot: string; Icon: any }> = {
  SERVICEABLE:   { label: "Serviceable",   bg: "bg-green-100 dark:bg-green-500/15", text: "text-green-700 dark:text-green-400", dot: "bg-green-500 dark:bg-green-500", Icon: CheckCircle2  },
  UNSERVICEABLE: { label: "Unserviceable", bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500 dark:bg-amber-500", Icon: AlertTriangle },
  MISSING:       { label: "Missing",       bg: "bg-red-100 dark:bg-red-500/15",   text: "text-red-700 dark:text-red-400",   dot: "bg-red-500 dark:bg-red-500",   Icon: XCircle       },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activeBorrowings(eq: Equipment) { return eq.borrowings.filter(b => !b.actual_return); }
function returnedBorrowings(eq: Equipment) { return eq.borrowings.filter(b => !!b.actual_return); }

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F4F5F7] dark:border-[#262626] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[#F4F5F7] dark:bg-[#262626] flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-[#6B7280] dark:text-[#A3A3A3]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3] uppercase tracking-wide">{label}</p>
        <div className="text-[13px] text-[#1F2937] dark:text-white font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ─── BORROW ROW ───────────────────────────────────────────────────────────────
function BorrowRow({ b, onReturn }: { b: Borrowing; onReturn: (id: number) => void }) {
  const returned = !!b.actual_return;
  return (
    <div className={`rounded-xl border px-4 py-3 ${
      b.is_overdue && !returned ? "border-red-200 bg-red-50 dark:bg-red-500/15"
      : returned               ? "border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]"
      :                          "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#1F2937] dark:text-white">{b.borrower_name}</p>
            {b.is_overdue && !returned && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 uppercase tracking-wide">Overdue</span>
            )}
            {returned && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 uppercase tracking-wide">Returned</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Borrowed: {fmtDate(b.date_borrowed)}</span>
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Due: {fmtDate(b.expected_return)}</span>
            {b.actual_return && (
              <span className="text-[11px] text-green-600 dark:text-green-400">Returned: {fmtDate(b.actual_return)}</span>
            )}
          </div>
          {b.return_condition && (
            <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] mt-0.5">Condition on return: {b.return_condition}</p>
          )}
          {b.recorder && (
            <p className="text-[10px] text-[#C4C9D4] dark:text-[#404040] mt-0.5">Recorded by: {b.recorder.username}</p>
          )}
        </div>
        {!returned && (
          <button
            onClick={() => onReturn(b.id)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[11px] font-bold hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] transition"
          >
            Return
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────
function Tab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition
        ${active ? "bg-[#3B82F6] text-white" : "text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"}`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
        ${active ? "bg-blue-400 dark:bg-blue-500 text-white" : "bg-[#E9EAEC] dark:bg-[#262626] text-[#6B7280] dark:text-[#A3A3A3]"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/equipment/${params.id}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setEquipment)
      .catch(() => router.push("/equipment"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const [tab, setTab] = useState<"active" | "history">("active");

  function handleReturn(borrowingId: number) {
    router.push(`/equipment/return?borrowing_id=${borrowingId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
      </div>
    );
  }

  // Loading finished with no record — the fetch's .catch() above is already
  // redirecting away, so render nothing while that navigation completes
  // rather than crash on null property access below.
  if (!equipment) return null;

  const active   = activeBorrowings(equipment);
  const returned = returnedBorrowings(equipment);
  const cfg      = STATUS_CONFIG[equipment.status];
  const StatusIcon = cfg.Icon;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/equipment")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280] dark:text-[#A3A3A3]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#F4F5F7] dark:bg-[#262626] flex items-center justify-center overflow-hidden">
              {equipment.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- inventory photos are user-supplied external URLs
                <img src={equipment.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package size={20} className="text-[#6B7280] dark:text-[#A3A3A3]" />
              )}
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] dark:text-white uppercase tracking-wide">{equipment.name}</h1>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Equipment ID: #{String(equipment.id).padStart(5, "0")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
            className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] dark:hover:bg-[#F59E0B] text-white text-[12px] font-bold transition"
          >
            Lend Out
          </button>
          <button
            onClick={() => router.push(`/equipment/${equipment.id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E9EAEC] dark:border-[#262626] text-[12px] font-bold text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] transition"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left: Info card ── */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white mb-3">Equipment Info</p>

            <InfoRow icon={Hash} label="Equipment ID">
              #{String(equipment.id).padStart(5, "0")}
            </InfoRow>
            <InfoRow icon={Layers} label="Type">
              {equipment.asset_type ?? "—"}
            </InfoRow>
            <InfoRow icon={Layers} label="Quantity">
              {equipment.quantity} piece{equipment.quantity !== 1 ? "s" : ""}
            </InfoRow>
            <InfoRow icon={Wrench} label="Condition">
              {equipment.condition ? (CONDITION_LABELS[equipment.condition] ?? equipment.condition) : "—"}
            </InfoRow>
            <InfoRow icon={Hash} label="Serial Number">
              {equipment.serial_number ?? "—"}
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Date Acquired">
              {equipment.date_acquired ? fmtDate(equipment.date_acquired) : "—"}
            </InfoRow>
            <InfoRow icon={StatusIcon} label="Status">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </InfoRow>
          </div>

          {/* Valuation */}
          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white mb-3">Valuation</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#171717] border border-[#F4F5F7] dark:border-[#262626] px-4 py-3">
                <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] uppercase font-semibold">Purchase Cost</p>
                <p className="text-[15px] font-black text-[#1F2937] dark:text-white mt-0.5">{fmtCurrency(equipment.purchase_cost)}</p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#171717] border border-[#F4F5F7] dark:border-[#262626] px-4 py-3">
                <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] uppercase font-semibold">Current Value</p>
                <p className="text-[15px] font-black text-[#1F2937] dark:text-white mt-0.5">{fmtCurrency(equipment.current_value)}</p>
              </div>
            </div>
            {equipment.purchase_date && (
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] mt-3">Purchased {fmtDate(equipment.purchase_date)}</p>
            )}
          </div>

          {/* Assignment */}
          {(equipment.assigned_to || equipment.location) && (
            <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white mb-3">Assignment</p>
              <InfoRow icon={Hash} label="Assigned To">{equipment.assigned_to ?? "—"}</InfoRow>
              <InfoRow icon={Hash} label="Location">{equipment.location ?? "—"}</InfoRow>
            </div>
          )}

          {/* Description */}
          {equipment.description && (
            <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white mb-3">Description</p>
              <p className="text-[13px] text-[#374151] dark:text-[#D4D4D4] leading-relaxed">{equipment.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] dark:text-white mb-3">Metadata</p>
            <InfoRow icon={CalendarDays} label="Added to Inventory">{fmtDate(equipment.created_at)}</InfoRow>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3 text-center">
              <p className={`text-[22px] font-black ${active.length > 0 ? "text-[#3B82F6] dark:text-[#60A5FA]" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>
                {active.length}
              </p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] uppercase font-semibold mt-0.5">Out</p>
            </div>
            <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3 text-center">
              <p className={`text-[22px] font-black ${active.some(b => b.is_overdue) ? "text-red-500 dark:text-red-400" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>
                {active.filter(b => b.is_overdue).length}
              </p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] uppercase font-semibold mt-0.5">Overdue</p>
            </div>
            <div className="col-span-2 bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] px-4 py-3 text-center">
              <p className="text-[22px] font-black text-[#1F2937] dark:text-white">{equipment.borrowings.length}</p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3] uppercase font-semibold mt-0.5">Total Borrows (All Time)</p>
            </div>
          </div>
        </div>

        {/* ── Right: Borrowings ── */}
        <div className="col-span-2 bg-white dark:bg-[#171717] rounded-xl border border-[#E9EAEC] dark:border-[#262626] overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
            <Tab label="Currently Borrowed" count={active.length}   active={tab === "active"}  onClick={() => setTab("active")}  />
            <Tab label="Return History"     count={returned.length} active={tab === "history"} onClick={() => setTab("history")} />
          </div>

          <div className="p-5 space-y-3">
            {tab === "active" ? (
              active.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Clock size={28} className="text-[#D1D5DB] dark:text-[#525252]" />
                  <p className="text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">No items currently borrowed</p>
                  <button
                    onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] dark:hover:bg-[#F59E0B] text-white text-[12px] font-bold transition"
                  >
                    Lend Out Now
                  </button>
                </div>
              ) : (
                active.map(b => <BorrowRow key={b.id} b={b} onReturn={handleReturn} />)
              )
            ) : (
              returned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Package size={28} className="text-[#D1D5DB] dark:text-[#525252]" />
                  <p className="text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">No return history yet</p>
                </div>
              ) : (
                returned.map(b => <BorrowRow key={b.id} b={b} onReturn={handleReturn} />)
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}