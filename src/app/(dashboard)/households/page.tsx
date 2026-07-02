"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Users, MapPin, UserX, Search, Plus, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { MOCK_HOUSEHOLDS, MOCK_PUROKS, memberFullName } from "@/lib/mock/households";
import type { HouseholdMock } from "@/lib/mock/households";

const HOUSING_LABEL: Record<string, string> = {
  OWN: "Own",
  RENT: "Rent",
  SHARED: "Shared",
  INFORMAL: "Informal",
};

export default function HouseholdsListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [households] = useState<HouseholdMock[]>(MOCK_HOUSEHOLDS);
  const [puroks] = useState(MOCK_PUROKS);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [purokFilter, setPurokFilter] = useState("");

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [households, setHouseholds] = useState<HouseholdMock[]>([]);
  // const [puroks, setPuroks] = useState<PurokMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   fetch("/api/puroks").then((r) => r.json()).then(setPuroks).catch(console.error);
  // }, []);
  //
  // useEffect(() => {
  //   async function loadHouseholds() {
  //     setLoading(true);
  //     try {
  //       const params = new URLSearchParams({ limit: "50" });
  //       if (purokFilter) params.set("purok_id", purokFilter);
  //       const res = await fetch(`/api/households?${params}`);
  //       const data = await res.json();
  //       setHouseholds(data.households ?? []);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadHouseholds();
  // }, [purokFilter]);

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

  return (
    <div>
      <PageHeader
        title="Households"
        subtitle="Manage household records, heads, and members"
        actions={
          <button
            onClick={() => router.push("/households/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            Add Household
          </button>
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
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search household no., address, or head name"
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
        <select
          value={purokFilter}
          onChange={(e) => setPurokFilter(e.target.value)}
          className="rounded-xl border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
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
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Household No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Address</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Purok</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Household Head</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Members</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Housing Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => router.push(`/households/${h.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937]">{h.household_no}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{h.address}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                      {h.purok.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">
                    {h.household_head ? memberFullName(h.household_head) : <span className="text-[#D1D5DB]">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{h.members.length}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280]">{HOUSING_LABEL[h.housing_type ?? ""] ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#D1D5DB]" />
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