// src/components/equipment/EquipmentDetailSheet.tsx
//
// The equipment detail + borrow-history view, as a slide-over instead of a
// full page navigation. Content mirrors (dashboard)/equipment/[id]/page.tsx
// (which still exists for direct links/bookmarks), just re-homed so it can
// render inside <Sheet> and be driven by an `equipmentId` prop from the
// list page. Mirrors the pattern set by BlotterCaseSheet / RegistryDetailSheet.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Pencil, Clock, CheckCircle2, AlertTriangle, XCircle,
  CalendarDays, Hash, Layers, Wrench, ExternalLink, Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";

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

interface EquipmentDetailSheetProps {
  /** The equipment item to show, or null to keep the sheet closed. */
  equipmentId: number | null;
  onClose: () => void;
  /** Called after data affecting the list (e.g. a return) should be refetched. */
  onUpdated?: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  NEEDS_REPAIR: "Needs Repair",
  DECOMMISSIONED: "Decommissioned",
};

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; bg: string; text: string; dot: string; Icon: LucideIcon }> = {
  SERVICEABLE: { label: "Serviceable", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", Icon: CheckCircle2 },
  UNSERVICEABLE: { label: "Unserviceable", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", Icon: AlertTriangle },
  MISSING: { label: "Missing", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", Icon: XCircle },
};

function fmtCurrency(value: number | string | null | undefined) {
  const n = value === null || value === undefined ? 0 : Number(value);
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function activeBorrowings(eq: Equipment) { return eq.borrowings.filter((b) => !b.actual_return); }
function returnedBorrowings(eq: Equipment) { return eq.borrowings.filter((b) => !!b.actual_return); }

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#F4F5F7] py-2.5 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F7]">
        <Icon size={13} className="text-[#6B7280]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <div className="mt-0.5 text-[13px] font-medium text-[#1F2937]">{children}</div>
      </div>
    </div>
  );
}

function BorrowRow({ b, onReturn }: { b: Borrowing; onReturn: (id: number) => void }) {
  const returned = !!b.actual_return;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        b.is_overdue && !returned ? "border-red-200 bg-red-50" : returned ? "border-[#E9EAEC] bg-[#F9FAFB]" : "border-[#E9EAEC] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#1F2937]">{b.borrower_name}</p>
            {b.is_overdue && !returned && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">Overdue</span>
            )}
            {returned && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-600">Returned</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="text-[11px] text-[#9CA3AF]">Borrowed: {fmtDate(b.date_borrowed)}</span>
            <span className="text-[11px] text-[#9CA3AF]">Due: {fmtDate(b.expected_return)}</span>
            {b.actual_return && <span className="text-[11px] text-green-600">Returned: {fmtDate(b.actual_return)}</span>}
          </div>
          {b.return_condition && <p className="mt-0.5 text-[11px] text-[#6B7280]">Condition on return: {b.return_condition}</p>}
          {b.recorder && <p className="mt-0.5 text-[10px] text-[#C4C9D4]">Recorded by: {b.recorder.username}</p>}
        </div>
        {!returned && (
          <button
            onClick={() => onReturn(b.id)}
            className="shrink-0 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Return
          </button>
        )}
      </div>
    </div>
  );
}

function Tab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold transition
        ${active ? "bg-[#3B82F6] text-white" : "text-[#6B7280] hover:bg-[#F4F5F7]"}`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-blue-400 text-white" : "bg-[#E9EAEC] text-[#6B7280]"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function EquipmentDetailSheet({ equipmentId, onClose, onUpdated }: EquipmentDetailSheetProps) {
  const router = useRouter();
  const open = equipmentId !== null;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (equipmentId !== null && equipmentId !== syncedId) {
    setSyncedId(equipmentId);
    setEquipment(null);
    setLoading(true);
    setTab("active");
  } else if (equipmentId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (equipmentId === null) return;
    let cancelled = false;

    fetch(`/api/equipment/${equipmentId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => { if (!cancelled) setEquipment(data); })
      .catch(() => { if (!cancelled) setEquipment(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [equipmentId]);

  function handleReturn(borrowingId: number) {
    router.push(`/equipment/return?borrowing_id=${borrowingId}`);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) { onUpdated?.(); onClose(); } }}>
      <SheetContent widthClassName="max-w-4xl" className="p-0">
        {loading || !equipment ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Equipment not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="Equipment not found"
                  description="This item doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          (() => {
            const active = activeBorrowings(equipment);
            const returned = returnedBorrowings(equipment);
            const cfg = STATUS_CONFIG[equipment.status];
            const StatusIcon = cfg.Icon;

            return (
              <div className="flex h-full flex-col">
                <SheetHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F4F5F7]">
                      {equipment.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- inventory photos are user-supplied external URLs
                        <img src={equipment.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={16} className="text-[#6B7280]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle>{equipment.name}</SheetTitle>
                      <p className="mt-0.5 text-[12px] text-[#9CA3AF]">Equipment ID: #{String(equipment.id).padStart(5, "0")}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
                      className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#D97706]"
                    >
                      Lend Out
                    </button>
                    <button
                      onClick={() => router.push(`/equipment/${equipment.id}/edit`)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => router.push(`/equipment/${equipment.id}`)}
                      title="Open full page"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                    >
                      <ExternalLink size={15} />
                    </button>
                    <SheetClose onClick={() => onUpdated?.()} />
                  </div>
                </SheetHeader>

                <SheetBody>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* ── Left: Info ── */}
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Equipment Info</p>
                        <InfoRow icon={Hash} label="Equipment ID">#{String(equipment.id).padStart(5, "0")}</InfoRow>
                        <InfoRow icon={Layers} label="Type">{equipment.asset_type ?? "—"}</InfoRow>
                        <InfoRow icon={Layers} label="Quantity">{equipment.quantity} piece{equipment.quantity !== 1 ? "s" : ""}</InfoRow>
                        <InfoRow icon={Wrench} label="Condition">
                          {equipment.condition ? (CONDITION_LABELS[equipment.condition] ?? equipment.condition) : "—"}
                        </InfoRow>
                        <InfoRow icon={Hash} label="Serial Number">{equipment.serial_number ?? "—"}</InfoRow>
                        <InfoRow icon={CalendarDays} label="Date Acquired">
                          {equipment.date_acquired ? fmtDate(equipment.date_acquired) : "—"}
                        </InfoRow>
                        <InfoRow icon={StatusIcon} label="Status">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </InfoRow>
                      </div>

                      <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Valuation</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-[#F4F5F7] bg-[#F9FAFB] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Purchase Cost</p>
                            <p className="mt-0.5 text-[15px] font-black text-[#1F2937]">{fmtCurrency(equipment.purchase_cost)}</p>
                          </div>
                          <div className="rounded-xl border border-[#F4F5F7] bg-[#F9FAFB] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">Current Value</p>
                            <p className="mt-0.5 text-[15px] font-black text-[#1F2937]">{fmtCurrency(equipment.current_value)}</p>
                          </div>
                        </div>
                        {equipment.purchase_date && (
                          <p className="mt-3 text-[11px] text-[#9CA3AF]">Purchased {fmtDate(equipment.purchase_date)}</p>
                        )}
                      </div>

                      {(equipment.assigned_to || equipment.location) && (
                        <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Assignment</p>
                          <InfoRow icon={Hash} label="Assigned To">{equipment.assigned_to ?? "—"}</InfoRow>
                          <InfoRow icon={Hash} label="Location">{equipment.location ?? "—"}</InfoRow>
                        </div>
                      )}

                      {equipment.description && (
                        <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Description</p>
                          <p className="text-[13px] leading-relaxed text-[#374151]">{equipment.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#E9EAEC] bg-white px-4 py-3 text-center">
                          <p className={`text-[22px] font-black ${active.length > 0 ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>{active.length}</p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#9CA3AF]">Out</p>
                        </div>
                        <div className="rounded-xl border border-[#E9EAEC] bg-white px-4 py-3 text-center">
                          <p className={`text-[22px] font-black ${active.some((b) => b.is_overdue) ? "text-red-500" : "text-[#9CA3AF]"}`}>
                            {active.filter((b) => b.is_overdue).length}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#9CA3AF]">Overdue</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Right: Borrowings ── */}
                    <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
                      <div className="flex items-center gap-2 border-b border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
                        <Tab label="Borrowed" count={active.length} active={tab === "active"} onClick={() => setTab("active")} />
                        <Tab label="History" count={returned.length} active={tab === "history"} onClick={() => setTab("history")} />
                      </div>
                      <div className="space-y-3 p-4">
                        {tab === "active" ? (
                          active.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10">
                              <Clock size={26} className="text-[#D1D5DB]" />
                              <p className="text-[12px] text-[#9CA3AF]">No items currently borrowed</p>
                              <button
                                onClick={() => router.push(`/equipment/borrow?equipment_id=${equipment.id}`)}
                                className="mt-1 flex items-center gap-1 rounded-xl bg-[#F59E0B] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#D97706]"
                              >
                                <Plus size={12} /> Lend Out Now
                              </button>
                            </div>
                          ) : (
                            active.map((b) => <BorrowRow key={b.id} b={b} onReturn={handleReturn} />)
                          )
                        ) : returned.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-10">
                            <Package size={26} className="text-[#D1D5DB]" />
                            <p className="text-[12px] text-[#9CA3AF]">No return history yet</p>
                          </div>
                        ) : (
                          returned.map((b) => <BorrowRow key={b.id} b={b} onReturn={handleReturn} />)
                        )}
                      </div>
                    </div>
                  </div>
                </SheetBody>
              </div>
            );
          })()
        )}
      </SheetContent>
    </Sheet>
  );
}