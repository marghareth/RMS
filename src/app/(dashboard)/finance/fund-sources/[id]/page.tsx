// FILE: src/app/(dashboard)/finance/fund-sources/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Landmark, TrendingUp, TrendingDown, Wallet } from "lucide-react";
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

export default function FundSourceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [fundSource, setFundSource] = useState<FundSourceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/fund-sources/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => { if (!cancelled) setFundSource(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
      </div>
    );
  }

  if (!fundSource) {
    return (
      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        <EmptyState icon={Landmark} title="Fund source not found" description="This fund source doesn't exist or may have been removed." />
      </div>
    );
  }

  const totalRevenue = fundSource.transactions
    .filter((t) => t.type === "REVENUE")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalDisbursed = fundSource.transactions
    .filter((t) => t.type === "DISBURSEMENT")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <button
        onClick={() => router.push("/finance/fund-sources")}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={15} />
        Back to Fund Sources
      </button>

      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15">
            <Landmark size={20} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">{fundSource.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  fundSource.status === "ACTIVE" ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-[#A3A3A3]"
                }`}
              >
                {fundSource.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
            </div>
            {fundSource.code && <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{fundSource.code}</p>}
          </div>
        </div>
      </div>

      {fundSource.statutory_rule && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Statutory Rule</p>
          <p className="mt-0.5 text-[13px] text-[#374151] dark:text-[#D4D4D4]">{fundSource.statutory_rule}</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current Balance" value={fmtCurrency(fundSource.current_balance)} sub={`Started at ${fmtCurrency(fundSource.original_balance)}`} icon={Wallet} color="blue" />
        <StatCard label="Total Revenue" value={fmtCurrency(totalRevenue)} sub="All-time collected" icon={TrendingUp} color="green" />
        <StatCard label="Total Disbursed" value={fmtCurrency(totalDisbursed)} sub="All-time paid out" icon={TrendingDown} color="red" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        <div className="border-b border-[#E9EAEC] dark:border-[#262626] px-5 py-3">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Transaction History</p>
        </div>
        {fundSource.transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions yet" description="Revenue and disbursements posted against this fund source will appear here." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Description</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">OR #</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {fundSource.transactions.map((t) => (
                <tr key={t.id} className="border-b border-[#F4F5F7] dark:border-[#262626] last:border-b-0">
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{fmtDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        t.type === "REVENUE" ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.type === "REVENUE" ? "Revenue" : "Disbursement"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{t.description}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{t.or_number ?? "—"}</td>
                  <td className={`px-4 py-3 text-right text-[12px] font-bold ${t.type === "REVENUE" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {t.type === "REVENUE" ? "+" : "−"}{fmtCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}