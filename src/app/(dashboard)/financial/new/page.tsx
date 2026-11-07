// FILE: src/app/(dashboard)/financial/new/page.tsx
//
// EDITABLE CATEGORIES (Nov 2026): the Income / Expense category shortcuts
// are no longer a fixed list. Staff who can add transactions click
// "Edit list" next to them to add, rename or remove categories right here
// (ListEditorDialog → PUT /api/financial-categories). Until someone edits
// a list, the original defaults are used (src/lib/category-lists.ts).
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Pencil } from "lucide-react";
import { FinancialType, formatCurrency } from "@/lib/mock/financial";
import { FINANCIAL_CATEGORY_DEFAULTS, type FinancialListType } from "@/lib/category-lists";
import ListEditorDialog from "@/components/shared/ListEditorDialog";
import { useCan } from "@/lib/hooks/useCan";
import { moneyEntryProblems, problemFor } from "@/lib/form-rules";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";

export default function NewFinancialRecordPage() {
  const router = useRouter();
  const can = useCan();

  // Category shortcuts — the saved lists, or the defaults until they load.
  const [categoryLists, setCategoryLists] = useState<Record<FinancialListType, string[]>>(FINANCIAL_CATEGORY_DEFAULTS);
  const [editingList, setEditingList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/financial-categories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.INCOME) && Array.isArray(data?.EXPENSE)) setCategoryLists(data);
      })
      .catch(() => {
        // Keep the defaults; the shortcuts are a convenience only.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveCategoryList(list: string[]) {
    const res = await fetch("/api/financial-categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, categories: list }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Couldn't save the categories. Please try again.");
    setCategoryLists((prev) => ({ ...prev, [type]: data.categories }));
  }

  const [type, setType] = useState<FinancialType>("INCOME");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = categoryLists[type];
  const parsedAmount = useMemo(() => parseFloat(amount), [amount]);

  function handleCategoryPick(c: string) {
    setCategory(c);
    if (!description.trim()) setDescription(c);
  }

  // Amount above ₱0 and a date that has happened (src/lib/form-rules.ts; the API checks too).
  const moneyProblems = moneyEntryProblems({ amount, date }, { what: "Transaction date" });

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
    if (moneyProblems.length > 0) {
      setError(moneyProblems[0].message);
      return;
    }

    setSubmitting(true);

    

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
     try {
       const res = await fetch("/api/financial", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           transaction_type: type,
           amount: parsedAmount,
           description,
           transaction_date: date,
         }),
       });
     if (!res.ok) {
       const data = await res.json().catch(() => ({}));
       setError(data.message || "Something went wrong while saving. Please try again.");
       return;
     }
       router.push("/financial");
     } catch (e) {
       console.error(e);
       setError("Something went wrong while saving. Please try again.");
   } finally {
       setSubmitting(false);
     }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ListEditorDialog
        open={editingList}
        title={type === "INCOME" ? "Edit income categories" : "Edit expense categories"}
        description="These are the shortcut buttons on this form. Picking one fills in the Description. Changes apply to everyone and don't affect transactions already saved."
        items={categories}
        defaults={FINANCIAL_CATEGORY_DEFAULTS[type]}
        onSave={saveCategoryList}
        onClose={() => setEditingList(false)}
      />
      <button
        onClick={() => router.push("/financial")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Financial Records
      </button>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Add Transaction</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">Record a new income or expense entry.</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
        {/* Type toggle */}
        <div data-tour="page-financial-new-type" className="mb-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("INCOME");
              setCategory("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
              type === "INCOME"
                ? "border-[#059669] dark:border-[#34D399] bg-[#D1FAE5] dark:bg-emerald-500/15 text-[#059669] dark:text-[#34D399]"
                : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#9CA3AF] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
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
                ? "border-[#DC2626] dark:border-[#F87171] bg-[#FEE2E2] dark:bg-red-500/15 text-[#DC2626] dark:text-[#F87171]"
                : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#9CA3AF] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
            }`}
          >
            <ArrowDownCircle size={16} />
            Expense
          </button>
        </div>

        <div className="space-y-4">
          {/* Category quick-picks */}
          <div data-tour="page-financial-new-category">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Category <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(fills description below)</span>
              </label>
              {can("financial:write") && (
                <button
                  type="button"
                  onClick={() => setEditingList(true)}
                  className="flex items-center gap-1 text-[12px] font-semibold text-(--brand-fg) transition hover:underline"
                >
                  <Pencil size={12} /> Edit list
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCategoryPick(c)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                    category === c
                      ? "border-(--brand-line) bg-(--brand-tint) text-(--brand-fg-strong)"
                      : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div data-tour="page-financial-new-description">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Honoraria — Barangay Tanod (June 2026)"
              className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
            />
          </div>

          <div data-tour="page-financial-new-amount" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Amount (PHP)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2.5 pl-7 pr-3 text-[13px] outline-none focus:border-(--brand-line)"
                />
              </div>
              {amount && !isNaN(parsedAmount) && parsedAmount > 0 && (
                <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{formatCurrency(parsedAmount)}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line) ${problemFor(moneyProblems, "date") ? fieldErrorBorder : ""}`}
                max={new Date().toLocaleDateString("en-CA")}
                aria-invalid={!!(problemFor(moneyProblems, "date"))}
              />
              <FieldError message={problemFor(moneyProblems, "date")} />
            </div>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/financial")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              data-tour="page-financial-new-save"
              onClick={handleSubmit}
              disabled={submitting}
              className={`rounded-lg px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition disabled:opacity-60 ${
                type === "INCOME" ? "bg-[#059669] dark:bg-emerald-600 hover:bg-[#047857] dark:hover:bg-emerald-600" : "bg-[#DC2626] dark:bg-red-600 hover:bg-[#B91C1C] dark:hover:bg-red-600"
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