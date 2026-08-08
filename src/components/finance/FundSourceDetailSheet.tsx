// src/components/finance/FundSourceDetailSheet.tsx
//
// The fund source detail + transaction history view, as a slide-over
// instead of a full page navigation. Content mirrors
// (dashboard)/finance/fund-sources/[id]/page.tsx (which still exists for
// direct links/bookmarks), just re-homed so it can render inside <Sheet>
// and be driven by a `fundSourceId` prop from the fund sources list page.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, TrendingUp, TrendingDown, Wallet, ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { fmtCurrency, fmtDate, FundSourceRecord } from "@/lib/finance";

interface Transaction {
  id: string;
  type: "REVENUE" | "DISBURSEMENT";
  date: string;
  amount: number | string;
  description: string;
  or_number: string | null;
}

type FundSourceDetail = FundSourceRecord & { transactions: Transaction[] };

interface FundSourceDetailSheetProps {
  /** The fund source to show, or null to keep the sheet closed. */
  fundSourceId: number | null;
  onClose: () => void;
}

export default function FundSourceDetailSheet({ fundSourceId, onClose }: FundSourceDetailSheetProps) {
  const router = useRouter();
  const open = fundSourceId !== null;

  const [fundSource, setFundSource] = useState<FundSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (fundSourceId !== null && fundSourceId !== syncedId) {
    setSyncedId(fundSourceId);
    setFundSource(null);
    setLoading(true);
  } else if (fundSourceId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (fundSourceId === null) return;
    let cancelled = false;

    fetch(`/api/fund-sources/${fundSourceId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data) => { if (!cancelled) setFundSource(data); })
      .catch(() => { if (!cancelled) setFundSource(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fundSourceId]);

  const totalRevenue = fundSource
    ? fundSource.transactions.filter((t) => t.type === "REVENUE").reduce((s, t) => s + Number(t.amount), 0)
    : 0;
  const totalDisbursed = fundSource
    ? fundSource.transactions.filter((t) => t.type === "DISBURSEMENT").reduce((s, t) => s + Number(t.amount), 0)
    : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent widthClassName="max-w-4xl" className="p-0">
        {loading || !fundSource ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Fund source not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={Landmark}
                  title="Fund source not found"
                  description="This fund source doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Landmark size={16} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle>{fundSource.name}</SheetTitle>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        fundSource.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {fundSource.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {fundSource.code && <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{fundSource.code}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/finance/fund-sources/${fundSource.id}`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {fundSource.statutory_rule && (
                <div className="rounded-xl border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Statutory Rule</p>
                  <p className="mt-0.5 text-[13px] text-[#374151]">{fundSource.statutory_rule}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Current Balance"
                  value={fmtCurrency(fundSource.current_balance)}
                  sub={`Started at ${fmtCurrency(fundSource.original_balance)}`}
                  icon={Wallet}
                  color="blue"
                />
                <StatCard label="Total Revenue" value={fmtCurrency(totalRevenue)} sub="All-time collected" icon={TrendingUp} color="green" />
                <StatCard label="Total Disbursed" value={fmtCurrency(totalDisbursed)} sub="All-time paid out" icon={TrendingDown} color="red" />
              </div>

              <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
                <div className="border-b border-[#E9EAEC] px-5 py-3">
                  <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Transaction History</p>
                </div>
                {fundSource.transactions.length === 0 ? (
                  <EmptyState icon={Wallet} title="No transactions yet" description="Revenue and disbursements posted against this fund source will appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Date</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Type</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Description</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">OR #</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundSource.transactions.map((t) => (
                          <tr key={t.id} className="border-b border-[#F4F5F7] last:border-b-0">
                            <td className="px-4 py-3 text-[12px] text-[#6B7280]">{fmtDate(t.date)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  t.type === "REVENUE" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                }`}
                              >
                                {t.type === "REVENUE" ? "Revenue" : "Disbursement"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[12px] text-[#374151]">{t.description}</td>
                            <td className="px-4 py-3 text-[12px] text-[#6B7280]">{t.or_number ?? "—"}</td>
                            <td className={`px-4 py-3 text-right text-[12px] font-bold ${t.type === "REVENUE" ? "text-green-600" : "text-red-600"}`}>
                              {t.type === "REVENUE" ? "+" : "−"}{fmtCurrency(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SheetBody>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}