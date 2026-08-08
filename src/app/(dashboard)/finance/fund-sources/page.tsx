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
          <h1 className="text-[20px] font-bold text-[#1F2937]">Fund Sources</h1>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
            {items.length} source(s) · Combined balance {fmtCurrency(totalBalance)}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Fund Source"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] bg-white p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. General Fund"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. GF-2026"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Starting Balance (₱)</label>
              <input
                type="number"
                value={form.original_balance}
                onChange={(e) => setForm({ ...form, original_balance: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Statutory Rule</label>
              <input
                value={form.statutory_rule}
                onChange={(e) => setForm({ ...form, statutory_rule: e.target.value })}
                placeholder="e.g. 20% Development Fund per DILG-DBM JMC No. 2017-1"
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
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
              status === s ? "bg-[#3B82F6] text-white" : "bg-[#F4F5F7] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
          <EmptyState icon={Landmark} title="No fund sources found" description="Add a fund source to start tracking its balance." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className="rounded-xl border border-[#E9EAEC] bg-white p-5 text-left transition hover:border-[#3B82F6] hover:shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Landmark size={18} className="text-blue-500" />
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    f.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {f.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-[14px] font-bold text-[#1F2937]">{f.name}</p>
              {f.code && <p className="text-[11px] text-[#9CA3AF]">{f.code}</p>}
              <p className="mt-3 text-[20px] font-black text-[#1F2937]">{fmtCurrency(f.current_balance)}</p>
              <p className="text-[11px] text-[#9CA3AF]">Current balance</p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6]">
                View transaction history
                <ChevronRight size={13} />
              </div>
            </button>
          ))}
        </div>
      )}

      <FundSourceDetailSheet fundSourceId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}