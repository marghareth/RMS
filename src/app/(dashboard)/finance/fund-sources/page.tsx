// FILE: src/app/(dashboard)/finance/fund-sources/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Plus, X, ChevronRight } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import FundSourceDetailSheet from "@/components/finance/FundSourceDetailSheet";
import { fmtCurrency, FundSourceRecord } from "@/lib/finance";

const EMPTY_FORM = { name: "", code: "", statutory_rule: "", original_balance: "" };

export default function FundSourcesPage() {
  const [items, setItems] = useState<FundSourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/fund-sources?${params}`);
      setItems(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSubmit() {
    setError("");
    if (!form.name.trim()) return setError("Please enter a fund source name.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/fund-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code || undefined,
          statutory_rule: form.statutory_rule || undefined,
          original_balance: form.original_balance ? Number(form.original_balance) : undefined,
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

  const totalBalance = items.reduce((s, f) => s + Number(f.current_balance), 0);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#1F2937] dark:text-white">Fund Sources</h1>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            {items.length} source(s) · Combined balance {fmtCurrency(totalBalance)}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Fund Source"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. General Fund"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. GF-2026"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Starting Balance (₱)</label>
              <input
                type="number"
                value={form.original_balance}
                onChange={(e) => setForm({ ...form, original_balance: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Statutory Rule</label>
              <input
                value={form.statutory_rule}
                onChange={(e) => setForm({ ...form, statutory_rule: e.target.value })}
                placeholder="e.g. 20% Development Fund per DILG-DBM JMC No. 2017-1"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Fund Source"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1">
        {(["", "ACTIVE", "INACTIVE"] as const).map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
              status === s ? "bg-[#3B82F6] text-white" : "bg-[#F4F5F7] dark:bg-[#262626] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#E5E7EB] dark:hover:bg-[#262626]"
            }`}
          >
            {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          <EmptyState icon={Landmark} title="No fund sources found" description="Add a fund source to start tracking its balance." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_0.4fr] gap-4 border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] px-5 py-2.5">
            {["Fund Source", "Status", "Current Balance", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">{h}</span>
            ))}
          </div>

          {/* Rows */}
          {items.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className={`grid w-full grid-cols-[2fr_1fr_1fr_0.4fr] items-center gap-4 border-b border-[#F4F5F7] dark:border-[#262626] px-5 py-3.5 text-left transition last:border-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F] ${i % 2 !== 0 ? "bg-[#FAFAFA] dark:bg-[#171717]" : "bg-white dark:bg-[#171717]"}`}
            >
              {/* Fund Source */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
                  <Landmark size={15} className="text-blue-500 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#1F2937] dark:text-white">{f.name}</p>
                  {f.code && <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">{f.code}</p>}
                </div>
              </div>

              {/* Status */}
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  f.status === "ACTIVE" ? "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-[#A3A3A3]"
                }`}
              >
                {f.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>

              {/* Current Balance */}
              <span className="text-[13px] font-bold text-[#1F2937] dark:text-white">{fmtCurrency(f.current_balance)}</span>

              {/* Chevron */}
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-[#D1D5DB] dark:text-[#525252]" />
              </div>
            </button>
          ))}
        </div>
      )}

      <FundSourceDetailSheet fundSourceId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}