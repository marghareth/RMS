// FILE: src/app/(dashboard)/finance/appropriations/page.tsx
//
// SUB-CATEGORIES (Nov 2026): PS / MOOE / CO stay the official classes
// (the Budget Overview groups by them), and each appropriation can also
// have an optional sub-category, e.g. MOOE → "Office Supplies". Staff
// manage the sub-category lists right here ("Edit PS list" under the
// Category field → PUT /api/appropriation-subcategories), not in
// Admin. The list can be filtered by class and then by sub-category.
"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus, X, Search, Pencil } from "lucide-react";
import ListEditorDialog from "@/components/shared/ListEditorDialog";
import {
  APPROPRIATION_CLASSES, APPROPRIATION_SUBCATEGORY_DEFAULTS, type AppropriationClass,
} from "@/lib/category-lists";
import EmptyState from "@/components/shared/EmptyState";
import {
  fmtCurrency,
  APPROPRIATION_CATEGORY_LABELS, APPROPRIATION_CATEGORY_COLORS,
  AppropriationRecord, AppropriationCategory, AppropriationStatus, FundSourceMini,
} from "@/lib/finance";
import { readList } from "@/lib/fetch-json";
import { useCan } from "@/lib/hooks/useCan";
import { fieldProblems, problemFor } from "@/lib/form-rules";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";

const STATUS_STYLES: Record<AppropriationStatus, string> = {
  PENDING: "text-amber-600 dark:text-amber-400",
  APPROVED: "text-(--brand-fg) dark:text-[#93C5FD]",
  COMPLETED: "text-green-600 dark:text-green-400",
};

const EMPTY_FORM = { item_name: "", category: "PS" as AppropriationCategory, subcategory: "", appropriated_amount: "", payee: "", fund_source_id: "" };

const FIELD = "w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)";
const FILTER = "rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)";

export default function AppropriationsPage() {
  const can = useCan();
  const [items, setItems] = useState<AppropriationRecord[]>([]);
  const [fundSources, setFundSources] = useState<FundSourceMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [status, setStatus] = useState("");

  // Sub-category choices per class — saved lists, or the defaults until they load.
  const [subLists, setSubLists] = useState<Record<AppropriationClass, string[]>>(APPROPRIATION_SUBCATEGORY_DEFAULTS);
  const [editingClass, setEditingClass] = useState<AppropriationClass | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/appropriation-subcategories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && APPROPRIATION_CLASSES.every((c) => Array.isArray(data?.[c]))) setSubLists(data);
      })
      .catch(() => {
        // Keep the defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSubList(cls: AppropriationClass, list: string[]) {
    const res = await fetch("/api/appropriation-subcategories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cls, subcategories: list }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Couldn't save the sub-categories. Please try again.");
    setSubLists((prev) => ({ ...prev, [cls]: data.subcategories }));
    // If the one picked on the form was renamed or removed, clear it.
    setForm((f) => (f.category === cls && f.subcategory && !data.subcategories.includes(f.subcategory) ? { ...f, subcategory: "" } : f));
  }
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
      if (category && subcategoryFilter) params.set("subcategory", subcategoryFilter);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const [apRes, fsRes] = await Promise.all([
        fetch(`/api/appropriations?${params}`),
        fetch("/api/fund-sources"),
      ]);
      setItems(await readList(apRes));
      setFundSources(await readList(fsRes));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, subcategoryFilter, status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // src/lib/form-rules.ts; the API also checks obligated/disbursed against this amount.
  const formProblems = fieldProblems([
    { field: "item_name", label: "Item name", value: form.item_name, max: 200 },
    { field: "appropriated_amount", label: "Amount", value: form.appropriated_amount, kind: "money" },
  ]);

  async function handleSubmit() {
    setError("");
    if (!form.item_name.trim()) return setError("Please enter an item name.");
    if (!form.appropriated_amount || Number(form.appropriated_amount) < 0) {
      return setError("Please enter a valid appropriated amount.");
    }
    if (formProblems.length > 0) return setError(formProblems[0].message);
    setSubmitting(true);
    try {
      const res = await fetch("/api/appropriations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: form.item_name,
          category: form.category,
          subcategory: form.subcategory || null,
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
      <ListEditorDialog
        open={editingClass !== null}
        title={editingClass ? `Edit the ${editingClass} list` : ""}
        description={
          editingClass
            ? `Add or delete the items you can pick under ${editingClass} — ${APPROPRIATION_CATEGORY_LABELS[editingClass]}. PS, MOOE and CO themselves stay fixed because the official budget report groups by them. Changing this list doesn't change appropriations already saved.`
            : undefined
        }
        items={editingClass ? subLists[editingClass] : []}
        defaults={editingClass ? APPROPRIATION_SUBCATEGORY_DEFAULTS[editingClass] : undefined}
        onSave={(list) => saveSubList(editingClass!, list)}
        onClose={() => setEditingClass(null)}
      />
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Appropriations</h1>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">Budget items allocated across PS, MOOE, and Capital Outlay</p>
        </div>
        {can("appropriations:write") && (<button
          data-tour="page-appropriations-add"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Appropriation"}
        </button>)}
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          {error && <div className="mb-3 rounded-lg px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Item Name *</label>
              <input
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="e.g. Office Supplies FY2026"
                className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line) ${problemFor(formProblems, "item_name") ? fieldErrorBorder : ""}`}
                aria-invalid={!!(problemFor(formProblems, "item_name"))}
              />
              <FieldError message={problemFor(formProblems, "item_name")} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AppropriationCategory, subcategory: "" })}
                className={FIELD}
              >
                {APPROPRIATION_CLASSES.map((c) => (
                  <option key={c} value={c}>{c} — {APPROPRIATION_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              {can("appropriations:write") && (
                <button
                  type="button"
                  data-tour="page-appropriations-edit-list"
                  onClick={() => setEditingClass(form.category)}
                  className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-(--brand-fg) transition hover:underline"
                >
                  <Pencil size={12} /> Edit {form.category} list
                </button>
              )}
            </div>
            <div data-tour="page-appropriations-subcategory">
              <label className="mb-1 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Sub-category</label>
              <select
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                className={FIELD}
              >
                <option value="">— None —</option>
                {subLists[form.category].map((sc) => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Amount (₱) *</label>
              <input
                type="number"
                value={form.appropriated_amount}
                onChange={(e) => setForm({ ...form, appropriated_amount: e.target.value })}
                placeholder="0.00"
                className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line) ${problemFor(formProblems, "appropriated_amount") ? fieldErrorBorder : ""}`}
                aria-invalid={!!(problemFor(formProblems, "appropriated_amount"))}
              />
              <FieldError message={problemFor(formProblems, "appropriated_amount")} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Fund Source</label>
              <select
                value={form.fund_source_id}
                onChange={(e) => setForm({ ...form, fund_source_id: e.target.value })}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
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
              className="rounded-lg bg-(--brand) px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Appropriation"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div data-tour="page-appropriations-search" className="relative min-w-50 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item name"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-(--brand-line)"
          />
        </div>
        <select
          data-tour="page-appropriations-filters"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategoryFilter("");
          }}
          className={FILTER}
        >
          <option value="">All Categories</option>
          {APPROPRIATION_CLASSES.map((c) => <option key={c} value={c}>{c} — {APPROPRIATION_CATEGORY_LABELS[c]}</option>)}
        </select>
        {category && (
          <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className={FILTER} aria-label="Sub-category">
            <option value="">All {category} sub-categories</option>
            {subLists[category as AppropriationClass].map((sc) => <option key={sc} value={sc}>{sc}</option>)}
          </select>
        )}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)">
          <option value="">All Statuses</option>
          {(["PENDING", "APPROVED", "COMPLETED"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div data-tour="page-appropriations-table" className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No appropriations found" description="Try adjusting your filters, or add a new appropriation." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F0F1F3] dark:border-[#262626]">
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Item</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Category</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Fund Source</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Appropriated</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Disbursed</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]">
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{a.item_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']"
                      style={{ color: APPROPRIATION_CATEGORY_COLORS[a.category] }}
                      title={APPROPRIATION_CATEGORY_LABELS[a.category]}
                    >
                      {a.category}
                    </span>
                    {a.subcategory && (
                      <p className="mt-1 text-[12px] text-[#4B5563] dark:text-[#A3A3A3]">{a.subcategory}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{a.fund_source?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-semibold text-[#1F2937] dark:text-white">{fmtCurrency(a.appropriated_amount)}</td>
                  <td className="px-4 py-3 text-right text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{fmtCurrency(a.disbursed_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-[''] ${STATUS_STYLES[a.status]}`}>
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