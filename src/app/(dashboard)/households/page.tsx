// FILE: src/app/(dashboard)/households/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Home, Users, MapPin, UserX, Search, Plus, ChevronRight, Download } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { memberFullName, buildBimsCsv, downloadCsv } from "@/lib/mock/households";
import type { PurokMock, HouseholdMock } from "@/lib/mock/households";
import HouseholdDetailSheet from "@/components/households/HouseholdDetailSheet";

const HOUSING_LABEL: Record<string, string> = {
  OWN: "Own",
  RENT: "Rent",
  SHARED: "Shared",
  INFORMAL: "Informal",
};

export default function HouseholdsListPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [purokFilter, setPurokFilter] = useState("");

  const [households, setHouseholds] = useState<HouseholdMock[]>([]);
  const [puroks, setPuroks] = useState<PurokMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  // Exports the FULL dataset (not just the current filtered/paginated page)
  // so the BIMS submission is always complete — fetches fresh rather than
  // relying on the `households` state, which is capped at limit=50 above.
  async function handleExportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (purokFilter) params.set("purok_id", purokFilter);
      const res = await fetch(`/api/households?${params}`);
      const data = await res.json();
      const csv = buildBimsCsv(data.households ?? []);
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`bims-households-${today}.csv`, csv);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Households"
        subtitle="Manage household records, heads, and members"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] disabled:opacity-60"
            >
              <Download size={14} />
              {exporting ? "Exporting..." : "Export CSV (BIMS)"}
            </button>
            <button
              onClick={() => router.push("/households/new")}
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
            >
              <Plus size={15} />
              Add Household
            </button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Households" value={stats.total} sub="Registered records" icon={Home} color="blue" />
        <StatCard label="Avg. Household Size" value={stats.avgSize} sub="Members per household" icon={Users} color="green" />
        <StatCard label="Puroks Covered" value={stats.puroksCovered} sub={`of ${puroks.length} puroks`} icon={MapPin} color="amber" />
        <StatCard label="Without Household Head" value={stats.withoutHead} sub="Needs assignment" icon={UserX} color="red" />
      </div>

      {/* Search + purok filter */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search household no., address, or head name"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
          />
        </div>
        <select
          value={purokFilter}
          onChange={(e) => setPurokFilter(e.target.value)}
          className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
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
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Household No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Address</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Purok</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Household Head</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Members</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Housing Type</th>
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
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
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