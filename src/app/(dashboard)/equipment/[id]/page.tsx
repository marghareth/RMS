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
  borrowings: Borrowing[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<EquipmentStatus, { label: string; bg: string; text: string; dot: string; Icon: any }> = {
  SERVICEABLE:   { label: "Serviceable",   bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", Icon: CheckCircle2  },
  UNSERVICEABLE: { label: "Unserviceable", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", Icon: AlertTriangle },
  MISSING:       { label: "Missing",       bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500",   Icon: XCircle       },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activeBorrowings(eq: Equipment) { return eq.borrowings.filter(b => !b.actual_return); }
function returnedBorrowings(eq: Equipment) { return eq.borrowings.filter(b => !!b.actual_return); }

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F4F5F7] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[#F4F5F7] flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-[#6B7280]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{label}</p>
        <div className="text-[13px] text-[#1F2937] font-medium mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ─── BORROW ROW ───────────────────────────────────────────────────────────────
function BorrowRow({ b, onReturn }: { b: Borrowing; onReturn: (id: number) => void }) {
  const returned = !!b.actual_return;
  return (
    <div className={`rounded-xl border px-4 py-3 ${
      b.is_overdue && !returned ? "border-red-200 bg-red-50"
      : returned               ? "border-[#E9EAEC] bg-[#F9FAFB]"
      :                          "border-[#E9EAEC] bg-white"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#1F2937]">{b.borrower_name}</p>
            {b.is_overdue && !returned && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">Overdue</span>
            )}
            {returned && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 uppercase tracking-wide">Returned</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            <span className="text-[11px] text-[#9CA3AF]">Borrowed: {fmtDate(b.date_borrowed)}</span>
            <span className="text-[11px] text-[#9CA3AF]">Due: {fmtDate(b.expected_return)}</span>
            {b.actual_return && (
              <span className="text-[11px] text-green-600">Returned: {fmtDate(b.actual_return)}</span>
            )}
          </div>
          {b.return_condition && (
            <p className="text-[11px] text-[#6B7280] mt-0.5">Condition on return: {b.return_condition}</p>
          )}
          {b.recorder && (
            <p className="text-[10px] text-[#C4C9D4] mt-0.5">Recorded by: {b.recorder.username}</p>
          )}
        </div>
        {!returned && (
          <button
            onClick={() => onReturn(b.id)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[11px] font-bold hover:bg-[#2563EB] transition"
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
        ${active ? "bg-[#3B82F6] text-white" : "text-[#6B7280] hover:bg-[#F4F5F7]"}`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
        ${active ? "bg-blue-400 text-white" : "bg-[#E9EAEC] text-[#6B7280]"}`}>
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#F4F5F7] flex items-center justify-center">
              <Package size={20} className="text-[#6B7280]" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">{equipment.name}</h1>
              <p className="text-[11px] text-[#9CA3AF]">Equipment ID: #{String(equipment.id).padStart(5, "0")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
            className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-[12px] font-bold transition"
          >
            Lend Out
          </button>
          <button
            onClick={() => router.push(`/equipment/${equipment.id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left: Info card ── */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-3">Equipment Info</p>

            <InfoRow icon={Hash} label="Equipment ID">
              #{String(equipment.id).padStart(5, "0")}
            </InfoRow>
            <InfoRow icon={Layers} label="Quantity">
              {equipment.quantity} piece{equipment.quantity !== 1 ? "s" : ""}
            </InfoRow>
            <InfoRow icon={Wrench} label="Condition">
              {equipment.condition ?? "—"}
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

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3 text-center">
              <p className={`text-[22px] font-black ${active.length > 0 ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>
                {active.length}
              </p>
              <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold mt-0.5">Out</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3 text-center">
              <p className={`text-[22px] font-black ${active.some(b => b.is_overdue) ? "text-red-500" : "text-[#9CA3AF]"}`}>
                {active.filter(b => b.is_overdue).length}
              </p>
              <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold mt-0.5">Overdue</p>
            </div>
            <div className="col-span-2 bg-white rounded-xl border border-[#E9EAEC] px-4 py-3 text-center">
              <p className="text-[22px] font-black text-[#1F2937]">{equipment.borrowings.length}</p>
              <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold mt-0.5">Total Borrows (All Time)</p>
            </div>
          </div>
        </div>

        {/* ── Right: Borrowings ── */}
        <div className="col-span-2 bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E9EAEC] bg-[#F9FAFB]">
            <Tab label="Currently Borrowed" count={active.length}   active={tab === "active"}  onClick={() => setTab("active")}  />
            <Tab label="Return History"     count={returned.length} active={tab === "history"} onClick={() => setTab("history")} />
          </div>

          <div className="p-5 space-y-3">
            {tab === "active" ? (
              active.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Clock size={28} className="text-[#D1D5DB]" />
                  <p className="text-[13px] text-[#9CA3AF]">No items currently borrowed</p>
                  <button
                    onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-[12px] font-bold transition"
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
                  <Package size={28} className="text-[#D1D5DB]" />
                  <p className="text-[13px] text-[#9CA3AF]">No return history yet</p>
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