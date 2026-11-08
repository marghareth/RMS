// FILE: src/app/(dashboard)/visitors/page.tsx
//
// REDESIGN (Nov 2026): same list look as the Users page (ListUI). The stat
// cards became tabs — All · In the building · Checked out — and a summary
// line under the title ("2 in the building now · 9 visitors today").
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { DoorOpen, ChevronRight, Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import VisitorLogSheet from "@/components/visitors/VisitorLogSheet";
import {
  ListCard, ListTabs, ListSearch, ListToolbar, ListSummary, DateRangeFilter, THEAD_ROW, TH, TR_HOVER,
} from "@/components/shared/ListUI";
import { useCan } from "@/lib/hooks/useCan";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface VisitorLog {
  id: number;
  visitor_name: string;
  contact: string | null;
  purpose: string;
  person_to_visit: string | null;
  time_in: string;
  time_out: string | null;
}

interface FilterState {
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { date_from: "", date_to: "" };

type Tab = "ALL" | "IN" | "OUT";

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function VisitorLogListPage() {
  const can = useCan();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>("ALL");

  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const res = await fetch(`/api/visitor-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 300);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const counts = useMemo(() => {
    const today = new Date().toDateString();
    const inside = logs.filter((l) => !l.time_out).length;
    return {
      ALL: logs.length,
      IN: inside,
      OUT: logs.length - inside,
      today: logs.filter((l) => new Date(l.time_in).toDateString() === today).length,
    };
  }, [logs]);

  const shown = useMemo(
    () => logs.filter((l) => (tab === "IN" ? !l.time_out : tab === "OUT" ? !!l.time_out : true)),
    [logs, tab]
  );

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: counts.ALL },
    { key: "IN", label: "In the building", count: counts.IN },
    { key: "OUT", label: "Checked out", count: counts.OUT },
  ];

  return (
    <div>
      <PageHeader
        title="Visitor log"
        subtitle={
          loading && logs.length === 0 ? (
            "Walk-in visitors to the barangay hall"
          ) : (
            <ListSummary items={[`${counts.IN} in the building now`, `${counts.today} ${counts.today === 1 ? "visitor" : "visitors"} today`]} />
          )
        }
        actions={
          can("visitors:write") && (
            <button
              data-tour="page-visitors-add"
              onClick={() => setSelectedId("new")}
              className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-(--brand-hover)"
            >
              <Plus size={15} />
              New visitor
            </button>
          )
        }
      />

      <ListCard>
        <ListToolbar
          left={
            <div data-tour="page-visitors-stats">
              <ListTabs tabs={TABS} value={tab} onChange={setTab} label="Filter visitors" />
            </div>
          }
          right={
            <>
              <div data-tour="page-visitors-search" className="w-full sm:w-auto">
                <ListSearch value={search} onChange={setSearch} placeholder="Search name or purpose" />
              </div>
              <DateRangeFilter
                label="Time in"
                from={filters.date_from}
                to={filters.date_to}
                onChange={({ from, to }) => setFilters({ date_from: from, date_to: to })}
              />
            </>
          }
        />

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No visitors found" description="Try a different tab, search or date range, or log a new visitor." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>Visitor</th>
                <th className={TH}>Purpose</th>
                <th className={`${TH} hidden md:table-cell`}>Visiting</th>
                <th className={TH}>Time in</th>
                <th className={TH}>Status</th>
                <th className="w-8 px-2 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} onClick={() => setSelectedId(l.id)} className={`${TR_HOVER} cursor-pointer align-top`}>
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white">{l.visitor_name}</p>
                    {l.contact && <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{l.contact}</p>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#1F2937] dark:text-[#E5E5E5]">{l.purpose}</td>
                  <td className="hidden px-4 py-3 text-[13px] text-[#6B7280] dark:text-[#A3A3A3] md:table-cell">{l.person_to_visit || "—"}</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">
                    {formatTime(l.time_in)}
                    {l.time_out && <p className="mt-0.5 text-[12px]">Out {formatTime(l.time_out)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.time_out ? "CHECKED_OUT" : "ACTIVE"} label={l.time_out ? "Checked out" : "In the building"} />
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

      <VisitorLogSheet visitorId={selectedId} onClose={() => setSelectedId(null)} onSaved={loadLogs} />
    </div>
  );
}