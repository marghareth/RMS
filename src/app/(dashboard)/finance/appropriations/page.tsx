// FILE: src/app/(dashboard)/finance/appropriations/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus, X, Search } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  fmtCurrency,
  APPROPRIATION_CATEGORY_LABELS, APPROPRIATION_CATEGORY_COLORS,
  AppropriationRecord, AppropriationCategory, AppropriationStatus, FundSourceMini,
} from "@/lib/finance";

const STATUS_STYLES: Record<AppropriationStatus, string> = {
  PENDING: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  COMPLETED: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400",
};

const EMPTY_FORM = { item_name: "", category: "PS" as AppropriationCategory, appropriated_amount: "", payee: "", fund_source_id: "" };

export default function AppropriationsPage() {
  const [items, setItems] = useState<AppropriationRecord[]>([]);
  const [fundSources, setFundSources] = useState<FundSourceMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const [apRes, fsRes] = await Promise.all([
        fetch(`/api/appropriations?${params}`),
        fetch("/api/fund-sources"),
      ]);
      setItems(await apRes.json());
      setFundSources(await fsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSubmit() {
    setError("");
    if (!form.item_name.trim()) return setError("Please enter an item name.");
    if (!form.appropriated_amount || Number(form.appropriated_amount) < 0) {
      return setError("Please enter a valid appropriated amount.");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/appropriations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: form.item_name,
          category: form.category,
          appropriated_amount: Number(form.appropriated_amount),
          payee: form.payee || undefined,
          fund_source_id: form.fund_source_id ? Number(form.fund_source_id) : undefined,
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

  const totals = items.reduce(
    (acc, a) => ({
      appropriated: acc.appropriated + Number(a.appropriated_amount),
      disbursed: acc.disbursed + Number(a.disbursed_amount),
    }),
    { appropriated: 0, disbursed: 0 }
  );

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1F2937] dark:text-white">Appropriations</h1>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">Budget items allocated across PS, MOOE, and Capital Outlay</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Appropriation"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Item Name *</label>
              <input
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="e.g. Office Supplies FY2026"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AppropriationCategory })}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              >
                {(["PS", "MOOE", "CO"] as const).map((c) => (
                  <option key={c} value={c}>{c} — {APPROPRIATION_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Amount (₱) *</label>
              <input
                type="number"
                value={form.appropriated_amount}
                onChange={(e) => setForm({ ...form, appropriated_amount: e.target.value })}
                placeholder="0.00"
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
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Appropriation"}
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
            placeholder="Search item name"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]">
          <option value="">All Categories</option>
          {(["PS", "MOOE", "CO"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]">
          <option value="">All Statuses</option>
          {(["PENDING", "APPROVED", "COMPLETED"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No appropriations found" description="Try adjusting your filters, or add a new appropriation." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Item</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Category</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Fund Source</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Appropriated</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Disbursed</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]">
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{a.item_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: APPROPRIATION_CATEGORY_COLORS[a.category] }}
                    >
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{a.fund_source?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-semibold text-[#1F2937] dark:text-white">{fmtCurrency(a.appropriated_amount)}</td>
                  <td className="px-4 py-3 text-right text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{fmtCurrency(a.disbursed_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[a.status]}`}>
                      {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-[#F9FAFB] dark:bg-[#171717]">
                  <td colSpan={3} className="px-4 py-3 text-[12px] font-black uppercase text-[#1F2937] dark:text-white">Total</td>
                  <td className="px-4 py-3 text-right text-[12px] font-black text-[#1F2937] dark:text-white">{fmtCurrency(totals.appropriated)}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-black text-[#6B7280] dark:text-[#A3A3A3]">{fmtCurrency(totals.disbursed)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}