"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { FinancialType, INCOME_CATEGORIES, EXPENSE_CATEGORIES, formatCurrency } from "@/lib/mock/financial";

export default function NewFinancialRecordPage() {
  const router = useRouter();

  const [type, setType] = useState<FinancialType>("INCOME");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const parsedAmount = useMemo(() => parseFloat(amount), [amount]);

  function handleCategoryPick(c: string) {
    setCategory(c);
    if (!description.trim()) setDescription(c);
  }

  async function handleSubmit() {
    setError("");
    if (!description.trim()) {
      setError("Please provide a transaction description.");
      return;
    }
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!date) {
      setError("Please select a transaction date.");
      return;
    }

    setSubmitting(true);

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(
      `[MOCK] ${type === "INCOME" ? "Income" : "Expense"} of ${formatCurrency(parsedAmount)} recorded.\nA real save will redirect back to the financial ledger.`
    );
    router.push("/financial");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    // try {
    //   const res = await fetch("/api/financial", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       transaction_type: type,
    //       amount: parsedAmount,
    //       description,
    //       transaction_date: date,
    //     }),
    //   });
    //   if (!res.ok) throw new Error("Failed to save transaction");
    //   router.push("/financial");
    // } catch (e) {
    //   console.error(e);
    //   setError("Something went wrong while saving. Please try again.");
    // } finally {
    //   setSubmitting(false);
    // }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/financial")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Financial Records
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Add Transaction</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">Record a new income or expense entry.</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        {/* Type toggle */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("INCOME");
              setCategory("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
              type === "INCOME"
                ? "border-[#059669] bg-[#D1FAE5] text-[#059669]"
                : "border-[#E9EAEC] bg-white text-[#9CA3AF] hover:bg-[#F4F5F7]"
            }`}
          >
            <ArrowUpCircle size={16} />
            Income
          </button>
          <button
            type="button"
            onClick={() => {
              setType("EXPENSE");
              setCategory("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
              type === "EXPENSE"
                ? "border-[#DC2626] bg-[#FEE2E2] text-[#DC2626]"
                : "border-[#E9EAEC] bg-white text-[#9CA3AF] hover:bg-[#F4F5F7]"
            }`}
          >
            <ArrowDownCircle size={16} />
            Expense
          </button>
        </div>

        <div className="space-y-4">
          {/* Category quick-picks */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Category <span className="font-normal normal-case text-[#9CA3AF]">(fills description below)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCategoryPick(c)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                    category === c
                      ? "border-[#3B82F6] bg-[#EBF3FF] text-[#1D4ED8]"
                      : "border-[#E9EAEC] bg-white text-[#6B7280] hover:bg-[#F4F5F7]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Honoraria — Barangay Tanod (June 2026)"
              className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Amount (PHP)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9CA3AF]">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#E9EAEC] py-2.5 pl-7 pr-3 text-[13px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              {amount && !isNaN(parsedAmount) && parsedAmount > 0 && (
                <p className="mt-1 text-[11px] text-[#9CA3AF]">{formatCurrency(parsedAmount)}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/financial")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`rounded-lg px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition disabled:opacity-60 ${
                type === "INCOME" ? "bg-[#059669] hover:bg-[#047857]" : "bg-[#DC2626] hover:bg-[#B91C1C]"
              }`}
            >
              {submitting ? "Saving..." : `Save ${type === "INCOME" ? "Income" : "Expense"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}