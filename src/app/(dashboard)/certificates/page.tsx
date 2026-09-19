// FILE: src/app/(dashboard)/certificates/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileEdit,
  CalendarDays,
  CalendarRange,
  UserPlus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  X,
  Printer,
  CheckCheck,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import CertificateDetailSheet from "@/components/certificates/CertificateDetailSheet";
import {
  CERTIFICATE_TYPES,
  CertificateMock,
  certTypeLabel,
  residentFullName,
  formatISODate,
  certDisplayDate,
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
  //const [certificates] = useState<CertificateMock[]>(MOCK_CERTIFICATES);
  //const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Bulk selection ──────────────────────────────────────────────────────
  // Row checkboxes + a "Print Selected" / "Release Selected" action bar.
  // Kept as a plain Set of ids rather than storing full row objects — the
  // list re-fetches/filters constantly, and ids are stable across that.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [bulkReleasing, setBulkReleasing] = useState(false);
  const [bulkError, setBulkError] = useState("");

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkPrint() {
    if (selectedIds.size === 0) return;
    setBulkPrinting(true);
    setBulkError("");
    try {
      const ids = [...selectedIds].join(",");
      window.open(`/api/pdf/certificate/bulk?ids=${ids}`, "_blank");
    } finally {
      setBulkPrinting(false);
    }
  }

  async function handleBulkRelease() {
    if (selectedIds.size === 0) return;
    setBulkReleasing(true);
    setBulkError("");
    try {
      const res = await fetch("/api/certificates/bulk-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkError(data.message || "Bulk release failed.");
        return;
      }
      if (data.skipped?.length) {
        setBulkError(
          `Released ${data.released.length}, skipped ${data.skipped.length} (already released/cancelled).`
        );
      }
      clearSelection();
      await loadCertificates();
    } catch (e) {
      console.error(e);
      setBulkError("Bulk release failed.");
    } finally {
      setBulkReleasing(false);
    }
  }

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  const [certificates, setCertificates] = useState<CertificateMock[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filters.certificate_type) params.set("certificate_type", filters.certificate_type);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      setCertificates(data.certificates ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      if (filters.certificate_type && c.certificate_type !== filters.certificate_type) return false;
      if (filters.flagged_only && !c.flagged_manual) return false;
      if (filters.date_from && certDisplayDate(c).slice(0, 10) < filters.date_from) return false;
      if (filters.date_to && certDisplayDate(c).slice(0, 10) > filters.date_to) return false;
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
      const d = new Date(certDisplayDate(c));
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = certificates.filter((c) => new Date(certDisplayDate(c)).getFullYear() === now.getFullYear()).length;
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/certificates/templates")}
              className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
            >
              <FileEdit size={15} />
              Manage Templates
            </button>
            <button
              onClick={() => router.push("/certificates/new")}
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
            >
              <Plus size={15} />
              Issue Certificate
            </button>
          </div>
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
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cert no., resident name, or purpose"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#A3A3A3] focus:border-[#3B82F6]"
          />
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-[#3B82F6] text-white" : "border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Certificate Type
              </label>
              <select
                value={filters.certificate_type}
                onChange={(e) => setFilters((f) => ({ ...f, certificate_type: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-2 text-[12px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6]"
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
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2 py-2 text-[12px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                  To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-2 py-2 text-[12px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151] dark:text-[#D4D4D4]">
              <input
                type="checkbox"
                checked={filters.flagged_only}
                onChange={(e) => setFilters((f) => ({ ...f, flagged_only: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Walk-in / flagged only
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2 text-[12px] text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
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
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#BFDBFE] dark:border-[#3B5A85] bg-[#EFF6FF] dark:bg-[#14243F] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCheck size={14} className="text-[#2563EB] dark:text-[#60A5FA]" />
            <span className="text-[12px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
              {selectedIds.size} selected
            </span>
            <button onClick={clearSelection} className="text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#374151] dark:hover:text-white">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkError && <span className="text-[11px] text-[#B91C1C] dark:text-[#F87171]">{bulkError}</span>}
            <button
              onClick={handleBulkPrint}
              disabled={bulkPrinting}
              className="flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] dark:border-[#3B5A85] bg-white dark:bg-[#171717] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1D4ED8] dark:text-[#93C5FD] transition hover:bg-[#EFF6FF] dark:hover:bg-[#1F1F1F] disabled:opacity-60"
            >
              {bulkPrinting ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
              Print Selected
            </button>
            <button
              onClick={handleBulkRelease}
              disabled={bulkReleasing}
              className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {bulkReleasing ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
              Release Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
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
              <tr className="border-b border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filtered.map((c) => c.id)));
                      else clearSelection();
                    }}
                    className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040]"
                  />
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Cert No.</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Resident</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Purpose</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Issued</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="cursor-pointer border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040]"
                    />
                  </td>
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937] dark:text-white">{c.certificate_no}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] dark:bg-[#14243F] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#93C5FD]">
                      {certTypeLabel(c.certificate_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">
                    <div className="flex items-center gap-1.5">
                      {c.resident ? residentFullName(c.resident) : c.manual_name}
                      {c.flagged_manual && (
                        <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#D97706] dark:text-amber-400">
                          Walk-in
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-55 truncate px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{c.purpose}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{formatISODate(certDisplayDate(c))}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#D1D5DB] dark:text-[#404040]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CertificateDetailSheet certificateId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}