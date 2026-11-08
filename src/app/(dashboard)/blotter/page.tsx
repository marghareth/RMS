// FILE: src/app/(dashboard)/blotter/page.tsx
//
// REDESIGN (Nov 2026): same list look as the Users page (ListUI). The four
// stat cards (Filed / Ongoing / Resolved / Escalated) became tabs above
// the table that filter it — All · Filed · Ongoing · Resolved · Dismissed
// · Escalated, each with its count. Tabs filter the loaded cases, so the
// counts stay right; search and the date range still go to the server.
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, ChevronRight, Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import {
  ListCard, ListTabs, ListSearch, ListToolbar, ListSummary, DateRangeFilter, THEAD_ROW, TH, TR_HOVER,
} from "@/components/shared/ListUI";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import BlotterCaseSheet from "@/components/blotter/BlotterCaseSheet";
import { BlotterCaseMock, BlotterStatus, formatISODate } from "@/lib/mock/blotter";
import { useCan } from "@/lib/hooks/useCan";

// ── FILTER STATE ─────────────────────────────────────────────────────────────
interface FilterState {
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { date_from: "", date_to: "" };

type Tab = "ALL" | "FILED" | "ONGOING" | "RESOLVED" | "DISMISSED" | "ESCALATED";

export default function BlotterListPage() {
  const can = useCan();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>("ALL");

  const [cases, setCases] = useState<BlotterCaseMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const res = await fetch(`/api/blotter?${params}`);
      const data = await res.json();
      setCases(data.cases ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const t = setTimeout(loadCases, 300);
    return () => clearTimeout(t);
  }, [loadCases]);

  const counts = useMemo(
    () => ({
      ALL: cases.length,
      FILED: cases.filter((c) => c.status === "FILED").length,
      ONGOING: cases.filter((c) => c.status === "ONGOING").length,
      RESOLVED: cases.filter((c) => c.status === "RESOLVED").length,
      DISMISSED: cases.filter((c) => c.status === "DISMISSED").length,
      ESCALATED: cases.filter((c) => c.escalated).length,
    }),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (tab === "ESCALATED" ? !c.escalated : tab !== "ALL" && c.status !== tab) return false;
      if (filters.date_from && c.incident_date < filters.date_from) return false;
      if (filters.date_to && c.incident_date > filters.date_to) return false;
      if (q && !`${c.case_number} ${c.complainant_name} ${c.respondent_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, search, filters, tab]);

  const open = counts.FILED + counts.ONGOING;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: counts.ALL },
    { key: "FILED", label: "Filed", count: counts.FILED },
    { key: "ONGOING", label: "Ongoing", count: counts.ONGOING },
    { key: "RESOLVED", label: "Resolved", count: counts.RESOLVED },
    { key: "DISMISSED", label: "Dismissed", count: counts.DISMISSED },
    { key: "ESCALATED", label: "Escalated", count: counts.ESCALATED },
  ];

  return (
    <div>
      <PageHeader
        title="Blotter"
        subtitle={
          loading && cases.length === 0 ? (
            "Complaints, hearings and case status"
          ) : (
            <ListSummary
              items={[
                `${open} open ${open === 1 ? "case" : "cases"}`,
                counts.ESCALATED > 0 && `${counts.ESCALATED} escalated`,
                `${counts.RESOLVED} resolved`,
              ]}
            />
          )
        }
        actions={
          can("blotter:write") && (
            <button
              data-tour="page-blotter-add"
              onClick={() => router.push("/blotter/new")}
              className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-(--brand-hover)"
            >
              <Plus size={15} />
              File new case
            </button>
          )
        }
      />

      <ListCard>
        <ListToolbar
          left={
            <div data-tour="page-blotter-stats">
              <ListTabs tabs={TABS} value={tab} onChange={setTab} label="Filter cases by status" />
            </div>
          }
          right={
            <>
              <div data-tour="page-blotter-search" className="w-full sm:w-auto">
                <ListSearch value={search} onChange={setSearch} placeholder="Search case no. or names" />
              </div>
              <DateRangeFilter
                label="Incident date"
                from={filters.date_from}
                to={filters.date_to}
                onChange={({ from, to }) => setFilters({ date_from: from, date_to: to })}
              />
            </>
          }
        />

        {loading && cases.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Shield} title="No cases found" description="Try a different tab, search or date range, or file a new case." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>Case</th>
                <th className={TH}>Complainant</th>
                <th className={TH}>Respondent</th>
                <th className={`${TH} hidden md:table-cell`}>Hearing</th>
                <th className={TH}>Status</th>
                <th className="w-8 px-2 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setSelectedCaseId(c.id)} className={`${TR_HOVER} cursor-pointer align-top`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[13px] font-semibold tabular-nums text-[#1F2937] dark:text-white">{c.case_number}</p>
                    <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Incident {formatISODate(c.incident_date)}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">{c.complainant_name}</td>
                  <td className="px-4 py-3 text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">{c.respondent_name}</td>
                  <td className="hidden px-4 py-3 text-[13px] text-[#6B7280] dark:text-[#A3A3A3] md:table-cell">
                    {formatISODate(c.hearing_date) ?? "Not set"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status as BlotterStatus} />
                    {c.escalated && <p className="mt-0.5 text-[12px] font-medium text-red-700 dark:text-red-400">Escalated</p>}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <ChevronRight size={15} className="ml-auto text-[#C4C8CE] dark:text-[#525252]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListCard>

      <BlotterCaseSheet caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} onUpdated={loadCases} />
    </div>
  );
}