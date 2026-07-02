"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CalendarDays,
  CalendarRange,
  UserPlus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_CERTIFICATES,
  CERTIFICATE_TYPES,
  CertificateMock,
  certTypeLabel,
  residentFullName,
  formatISODate,
} from "@/lib/mock/certificates";

interface FilterState {
  certificate_type: string;
  date_from: string;
  date_to: string;
  flagged_only: boolean;
}

const EMPTY_FILTERS: FilterState = { certificate_type: "", date_from: "", date_to: "", flagged_only: false };

export default function CertificatesListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [certificates] = useState<CertificateMock[]>(MOCK_CERTIFICATES);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [certificates, setCertificates] = useState<CertificateMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadCertificates() {
  //     setLoading(true);
  //     try {
  //       const params = new URLSearchParams({ limit: "50" });
  //       if (filters.certificate_type) params.set("certificate_type", filters.certificate_type);
  //       if (filters.date_from) params.set("date_from", filters.date_from);
  //       if (filters.date_to) params.set("date_to", filters.date_to);
  //
  //       const res = await fetch(`/api/certificates?${params}`);
  //       const data = await res.json();
  //       setCertificates(data.certificates ?? []);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadCertificates();
  // }, [filters]);

  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      if (filters.certificate_type && c.certificate_type !== filters.certificate_type) return false;
      if (filters.flagged_only && !c.flagged_manual) return false;
      if (filters.date_from && c.issued_at.slice(0, 10) < filters.date_from) return false;
      if (filters.date_to && c.issued_at.slice(0, 10) > filters.date_to) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = c.resident ? residentFullName(c.resident) : c.manual_name ?? "";
        const hay = `${c.certificate_no} ${name} ${c.purpose} ${certTypeLabel(c.certificate_type)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [certificates, search, filters]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = certificates.filter((c) => {
      const d = new Date(c.issued_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = certificates.filter((c) => new Date(c.issued_at).getFullYear() === now.getFullYear()).length;
    const flagged = certificates.filter((c) => c.flagged_manual).length;
    return { total: certificates.length, thisMonth, thisYear, flagged };
  }, [certificates]);

  const activeFilterCount =
    (filters.certificate_type ? 1 : 0) + (filters.flagged_only ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Issue and track barangay certificates"
        actions={
          <button
            onClick={() => router.push("/certificates/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            Issue Certificate
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Issued" value={stats.total} sub="All-time records" icon={FileText} color="blue" />
        <StatCard label="This Month" value={stats.thisMonth} sub="Issued this month" icon={CalendarDays} color="green" />
        <StatCard label="This Year" value={stats.thisYear} sub="Issued this year" icon={CalendarRange} color="amber" />
        <StatCard label="Walk-in / Flagged" value={stats.flagged} sub="Not yet in RBI" icon={UserPlus} color="red" />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cert no., resident name, or purpose"
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "border border-[#E9EAEC] bg-white text-[#6B7280] hover:bg-[#F4F5F7]"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-3 rounded-xl border border-[#E9EAEC] bg-white p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937]">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Certificate Type
              </label>
              <select
                value={filters.certificate_type}
                onChange={(e) => setFilters((f) => ({ ...f, certificate_type: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
              >
                <option value="">All Types</option>
                {CERTIFICATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151]">
              <input
                type="checkbox"
                checked={filters.flagged_only}
                onChange={(e) => setFilters((f) => ({ ...f, flagged_only: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Walk-in / flagged only
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] py-2 text-[12px] text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-[12px] font-semibold text-white transition hover:bg-[#2563EB]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Certificates table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No certificates found"
            description="Try adjusting your search or filters, or issue a new certificate."
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Cert No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Resident</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Purpose</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Issued</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/certificates/${c.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937]">{c.certificate_no}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                      {certTypeLabel(c.certificate_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">
                    <div className="flex items-center gap-1.5">
                      {c.resident ? residentFullName(c.resident) : c.manual_name}
                      {c.flagged_manual && (
                        <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#D97706]">
                          Walk-in
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-55 truncate px-4 py-3 text-[12px] text-[#6B7280]">{c.purpose}</td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280]">{formatISODate(c.issued_at)}</td>
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