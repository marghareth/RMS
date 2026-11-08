// FILE: src/app/(dashboard)/households/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Home, Search, Plus, ChevronRight } from "lucide-react";
import { ListSummary } from "@/components/shared/ListUI";
import ExportMenu, { type ExportFormat } from "@/components/shared/ExportMenu";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { memberFullName } from "@/lib/mock/households";
import type { PurokMock, HouseholdMock } from "@/lib/mock/households";
import HouseholdDetailSheet from "@/components/households/HouseholdDetailSheet";
import { fetchJson } from "@/lib/fetch-json";
import { useCan } from "@/lib/hooks/useCan";

const HOUSING_LABEL: Record<string, string> = {
  OWN: "Own",
  RENT: "Rent",
  SHARED: "Shared",
  INFORMAL: "Informal",
};

export default function HouseholdsListPage() {
  const can = useCan();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [purokFilter, setPurokFilter] = useState("");

  const [households, setHouseholds] = useState<HouseholdMock[]>([]);
  const [puroks, setPuroks] = useState<PurokMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch("/api/puroks")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || body.message || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((json) => {
        if (!ignore && Array.isArray(json)) setPuroks(json);
      })
      .catch((e) => console.error("Failed to load puroks from /api/puroks:", e.message));

    return () => { ignore = true; };
  }, []);

   const loadHouseholds = useCallback(async () => {
     setLoading(true);
     try {
       const params = new URLSearchParams({ limit: "50" });
       if (purokFilter) params.set("purok_id", purokFilter);
       const res = await fetch(`/api/households?${params}`);
       const data = await res.json();
       setHouseholds(data.households ?? []);
     } catch (e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
   }, [purokFilter]);

   useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
     loadHouseholds();
   }, [loadHouseholds]);

  // ── CLIENT-SIDE FILTERING (stands in for the API query above) ───────────
  const filtered = useMemo(() => {
    return households.filter((h) => {
      if (purokFilter && String(h.purok_id) !== purokFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const headName = h.household_head ? memberFullName(h.household_head) : "";
        const hay = `${h.household_no} ${h.address} ${headName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [households, search, purokFilter]);

  const stats = useMemo(() => {
    const totalMembers = households.reduce((sum, h) => sum + h.members.length, 0);
    const avgSize = households.length ? (totalMembers / households.length).toFixed(1) : "0";
    const withoutHead = households.filter((h) => !h.household_head_id).length;
    return {
      total: households.length,
      avgSize,
      puroksCovered: new Set(households.map((h) => h.purok_id)).size,
      withoutHead,
    };
  }, [households]);

  // Export (Nov 2026): the same formatted Excel file as the Residents page,
  // built on the server (/api/households/export) from the purok filter and
  // search box shown here. Replaces the plain BIMS CSV. Admin and Secretary
  // only (residents:export); every export is logged.
  const canExport = can("residents:export");
  async function handleExport(format: ExportFormat) {
    setExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (purokFilter) params.set("purok_id", purokFilter);
      if (search.trim()) params.set("search", search.trim());
      if (format === "pdf") params.set("format", "pdf");
      const res = await fetch(`/api/households/export?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Export failed. Try again.");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `households.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Households"
        subtitle={<span><ListSummary items={[`${stats.total} ${stats.total === 1 ? "household" : "households"}`, `avg. ${stats.avgSize} members`, `${stats.puroksCovered} of ${puroks.length} puroks`, stats.withoutHead > 0 && `${stats.withoutHead} without a head`]} /></span>}
        actions={
          <div className="flex items-center gap-2">
            {canExport && (
              <ExportMenu
                dataTour="page-households-export"
                onExport={handleExport}
                exporting={exporting}
                disabled={filtered.length === 0}
                title={search.trim() || purokFilter ? "Export the households matching your search and purok" : "Export all households"}
                excelHint="Every field, plus a sheet of members"
                pdfHint="Household no., head, purok, address and members"
              />
            )}
            {can("households:write") && (<button
              data-tour="page-households-add"
              onClick={() => router.push("/households/new")}
              className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
            >
              <Plus size={15} />
              Add Household
            </button>)}
          </div>
        }
      />

      {exportError && (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
          Couldn&apos;t export households: {exportError} No file was saved.
        </div>
      )}

      {/* Search + purok filter */}
      <div className="mb-4 flex items-center gap-2">
        <div data-tour="page-households-search" className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search household no., address, or head name"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line)"
          />
        </div>
        <select
          value={purokFilter}
          onChange={(e) => setPurokFilter(e.target.value)}
          className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition focus:border-(--brand-line)"
        >
          <option value="">All Puroks</option>
          {puroks.map((p: { id: number; name: string }) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Households table */}
      <div data-tour="page-households-table" className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No households found"
            description="Try adjusting your search or filters, or add a new household."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F0F1F3] dark:border-[#262626]">
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Household No.</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Address</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Purok</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Household Head</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Members</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Housing Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => setSelectedId(h.id)}
                  className="cursor-pointer border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{h.household_no}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{h.address}</td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-[#374151] dark:text-[#D4D4D4]">
                      {h.purok.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">
                    {h.household_head ? memberFullName(h.household_head) : <span className="text-[#D1D5DB] dark:text-[#525252]">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{h.members.length}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{HOUSING_LABEL[h.housing_type ?? ""] ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#D1D5DB] dark:text-[#525252]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <HouseholdDetailSheet
        householdId={selectedId}
        onClose={() => setSelectedId(null)}
        onDeleted={loadHouseholds}
      />
    </div>
  );
}