// FILE: src/app/(dashboard)/finance/disbursements/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingDown, Plus, X, Search } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import {
  fmtCurrency, fmtDate, DisbursementRecord, FundSourceMini, AppropriationRecord,
} from "@/lib/finance";

const EMPTY_FORM = {
  payee: "", amount: "", date: new Date().toISOString().slice(0, 10),
  particular: "", check_number: "", or_number: "", fund_source_id: "", appropriation_id: "",
};

export default function DisbursementsPage() {
  const [items, setItems] = useState<DisbursementRecord[]>([]);
  const [fundSources, setFundSources] = useState<FundSourceMini[]>([]);
  const [appropriations, setAppropriations] = useState<AppropriationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fundSourceId, setFundSourceId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (fundSourceId) params.set("fund_source_id", fundSourceId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const [dbRes, fsRes, apRes] = await Promise.all([
        fetch(`/api/disbursements?${params}`),
        fetch("/api/fund-sources"),
        fetch("/api/appropriations"),
      ]);
      setItems(await dbRes.json());
      setFundSources(await fsRes.json());
      setAppropriations(await apRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, fundSourceId, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSubmit() {
    setError("");
    if (!form.payee.trim()) return setError("Please enter a payee.");
    if (!form.amount || Number(form.amount) < 0) return setError("Please enter a valid amount.");
    if (!form.date) return setError("Please select a date.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payee: form.payee,
          amount: Number(form.amount),
          date: form.date,
          particular: form.particular || undefined,
          check_number: form.check_number || undefined,
          or_number: form.or_number || undefined,
          fund_source_id: form.fund_source_id ? Number(form.fund_source_id) : undefined,
          appropriation_id: form.appropriation_id ? Number(form.appropriation_id) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to save");
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const total = items.reduce((s, d) => s + Number(d.amount), 0);
  const thisMonth = items
    .filter((d) => d.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1F2937] dark:text-white">Disbursements</h1>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">Payments made against appropriations and fund sources</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Record Disbursement"}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total (Filtered)" value={fmtCurrency(total)} sub={`${items.length} transaction(s)`} icon={TrendingDown} color="red" />
        <StatCard label="This Month" value={fmtCurrency(thisMonth)} sub="Disbursed so far" icon={TrendingDown} color="amber" />
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Payee *</label>
              <input
                value={form.payee}
                onChange={(e) => setForm({ ...form, payee: e.target.value })}
                placeholder="e.g. Meralco"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Amount (₱) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Particulars</label>
              <input
                value={form.particular}
                onChange={(e) => setForm({ ...form, particular: e.target.value })}
                placeholder="e.g. Electricity bill, June 2026"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Check #</label>
              <input
                value={form.check_number}
                onChange={(e) => setForm({ ...form, check_number: e.target.value })}
                placeholder="e.g. CHK-00812"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">OR Number</label>
              <input
                value={form.or_number}
                onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                placeholder="e.g. OR-00456"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Fund Source</label>
              <select
                value={form.fund_source_id}
                onChange={(e) => setForm({ ...form, fund_source_id: e.target.value })}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              >
                <option value="">— None —</option>
                {fundSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Appropriation</label>
              <select
                value={form.appropriation_id}
                onChange={(e) => setForm({ ...form, appropriation_id: e.target.value })}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              >
                <option value="">— None —</option>
                {appropriations.map((a) => (
                  <option key={a.id} value={a.id}>{a.item_name} ({a.category})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Disbursement"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-50 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payee, check #, OR #"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <select value={fundSourceId} onChange={(e) => setFundSourceId(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]">
          <option value="">All Fund Sources</option>
          {fundSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]" />
        <span className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]" />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={TrendingDown} title="No disbursements recorded" description="Try adjusting your filters, or record a new disbursement." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Payee</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Appropriation</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Fund Source</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]">
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937] dark:text-white">{d.payee}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{d.appropriation?.item_name ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{d.fund_source?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-bold text-red-600 dark:text-red-400">{fmtCurrency(d.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F9FAFB] dark:bg-[#171717]">
                <td colSpan={4} className="px-4 py-3 text-[12px] font-black uppercase text-[#1F2937] dark:text-white">Total</td>
                <td className="px-4 py-3 text-right text-[12px] font-black text-red-600 dark:text-red-400">{fmtCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}