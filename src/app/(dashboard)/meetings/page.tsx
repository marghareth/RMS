// FILE: src/app/(dashboard)/meetings/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users2,
  Gavel,
  Megaphone,
  CalendarClock,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  X,
  MapPin,
  ListChecks,
  Clock,
  FileWarning,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import MeetingDetailSheet from "@/components/meetings/MeetingDetailSheet";
import {
  MeetingRecordMock,
  meetingTypeLabel,
  formatISOTime,
  isUpcoming,
  MEETING_STATUSES,
} from "@/lib/mock/meetings";
import { useCan } from "@/lib/hooks/useCan";

interface FilterState {
  meeting_type: string;
  status: string;
  location: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { meeting_type: "", status: "", location: "", date_from: "", date_to: "" };

// ─── LIST LAYOUT HELPERS ──────────────────────────────────────────────────────
// The list is split into "Upcoming" (soonest first) and "Past meetings"
// (newest first, under a heading per month), so the next meeting is always at
// the top instead of the one furthest in the future.

const DAY_MS = 24 * 60 * 60 * 1000;

function monthHeading(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** "Today", "Tomorrow", "In 5 days" — only for upcoming meetings. */
function relativeDay(iso: string, now: Date) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date(iso)) - startOf(now)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  return `In ${Math.round(days / 7)} weeks`;
}

/** Calendar-style date tile: month, day number, weekday. */
function DateTile({ iso, highlight }: { iso: string; highlight: boolean }) {
  const d = new Date(iso);
  return (
    <div
      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${
        highlight
          ? "border-(--brand) bg-(--brand) text-white"
          : "border-[#E9EAEC] bg-[#F9FAFB] text-[#1F2937] dark:border-[#262626] dark:bg-[#1F1F1F] dark:text-white"
      }`}
      aria-hidden="true"
    >
      <span className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-white/80" : "text-[#6B7280] dark:text-[#A3A3A3]"}`}>
        {d.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span className="text-[19px] font-bold leading-none tabular-nums">{d.getDate()}</span>
      <span className={`mt-0.5 text-[9px] font-semibold uppercase ${highlight ? "text-white/80" : "text-[#9CA3AF] dark:text-[#737373]"}`}>
        {d.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
    </div>
  );
}

/** Small colored label: SB Meeting (navy, gavel) or Barangay Assembly (green, megaphone). */
function TypeLabel({ type }: { type: MeetingRecordMock["meeting_type"] }) {
  const sb = type === "SB_MEETING";
  const Icon = sb ? Gavel : Megaphone;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
        sb ? "bg-(--brand-tint) text-(--brand-fg-strong)" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      }`}
    >
      <Icon size={11} strokeWidth={2.25} />
      {meetingTypeLabel(type)}
    </span>
  );
}

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#F4F5F7] bg-[#F9FAFB] px-5 py-2 dark:border-[#262626] dark:bg-[#141414]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#A3A3A3]">{label}</span>
      {count !== undefined && (
        <span className="rounded-full bg-[#E9EAEC] px-1.5 text-[10px] font-bold tabular-nums text-[#6B7280] dark:bg-[#262626] dark:text-[#A3A3A3]">
          {count}
        </span>
      )}
    </div>
  );
}

export default function AssemblyListPage() {
  const can = useCan();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [meetings, setMeetings] = useState<MeetingRecordMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      // 100 is the most the API returns per request.
      const params = new URLSearchParams({ limit: "100" });
      if (filters.meeting_type) params.set("meeting_type", filters.meeting_type);
      if (filters.status) params.set("status", filters.status);
      if (filters.location) params.set("location", filters.location);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      // BUGFIX: the search box used to be sent as `title=`, so the server
      // dropped every meeting whose TITLE didn't match before the page could
      // search type, location and minutes as the placeholder promises.
      // Searching now happens on the loaded list (below) only.

      const res = await fetch(`/api/meetings?${params}`);
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeetings();
  }, [loadMeetings]);

  const filtered = useMemo(() => {
    return meetings
      .filter((m) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${m.title ?? ""} ${meetingTypeLabel(m.meeting_type)} ${m.location ?? ""} ${m.minutes ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  }, [meetings, search]);

  const { upcomingList, pastGroups } = useMemo(() => {
    const upcomingList = filtered
      .filter((m) => isUpcoming(m.meeting_date))
      .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
    const pastGroups: { heading: string; items: MeetingRecordMock[] }[] = [];
    for (const m of filtered.filter((m) => !isUpcoming(m.meeting_date))) {
      const heading = monthHeading(m.meeting_date);
      const last = pastGroups[pastGroups.length - 1];
      if (last && last.heading === heading) last.items.push(m);
      else pastGroups.push({ heading, items: [m] });
    }
    return { upcomingList, pastGroups };
  }, [filtered]);

  const stats = useMemo(() => {
    const now = new Date();
    const sb = meetings.filter((m) => m.meeting_type === "SB_MEETING").length;
    const assembly = meetings.filter((m) => m.meeting_type === "BARANGAY_ASSEMBLY").length;
    const upcoming = meetings.filter((m) => isUpcoming(m.meeting_date)).length;
    const thisYear = meetings.filter((m) => new Date(m.meeting_date).getFullYear() === now.getFullYear()).length;
    return { total: meetings.length, sb, assembly, upcoming, thisYear };
  }, [meetings]);

  const activeFilterCount =
    (filters.meeting_type ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Assembly / Meeting Records"
        subtitle="SB meetings and barangay assemblies, with agenda items and minutes"
        actions={
          (can("meetings:write") && (<button
            data-tour="page-meetings-add"
            onClick={() => router.push("/meetings/new")}
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
          >
            <Plus size={15} />
            New Meeting
          </button>))
        }
      />

      {/* Stat cards */}
      <div data-tour="page-meetings-stats" className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="SB Meetings" value={stats.sb} sub="Sangguniang Barangay" icon={Gavel} color="blue" />
        <StatCard label="Barangay Assemblies" value={stats.assembly} sub="Community-wide meetings" icon={Megaphone} color="green" />
        <StatCard label="Upcoming" value={stats.upcoming} sub="Scheduled ahead" icon={CalendarClock} color="amber" />
        <StatCard label="Recorded This Year" value={stats.thisYear} sub="Total meeting records" icon={Users2} color="red" />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div data-tour="page-meetings-search" className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, type, location, or minutes"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line)"
          />
        </div>
        <button
          data-tour="page-meetings-filter"
          onClick={() => setShowFilter((v) => !v)}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
            showFilter || activeFilterCount ? "bg-(--brand) text-white" : "border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
          }`}
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 dark:bg-red-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {showFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-3 rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937] dark:text-white">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF] dark:text-[#A3A3A3]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Meeting Type
              </label>
              <select
                value={filters.meeting_type}
                onChange={(e) => setFilters((f) => ({ ...f, meeting_type: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-(--brand-line)"
              >
                <option value="">All Types</option>
                <option value="SB_MEETING">SB Meeting</option>
                <option value="BARANGAY_ASSEMBLY">Barangay Assembly</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-(--brand-line)"
              >
                <option value="">All Statuses</option>
                {MEETING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Location
              </label>
              <input
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Barangay Hall"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-(--brand-line)"
              />
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-(--brand-line)"
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-(--brand-line)"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex-1 rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2 text-[12px] text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 rounded-lg bg-(--brand) py-2 text-[12px] font-semibold text-white transition hover:bg-(--brand-hover)"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meetings list */}
      <div data-tour="page-meetings-list" className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No meeting records found"
            description="Try adjusting your search or filters, or create a new meeting record."
          />
        ) : (
          <>
            {upcomingList.length > 0 && (
              <section aria-label="Upcoming meetings">
                <SectionHeading label="Upcoming" count={upcomingList.length} />
                {upcomingList.map((m, i) => (
                  <MeetingRow key={m.id} m={m} isNext={i === 0} onOpen={() => setSelectedId(m.id)} />
                ))}
              </section>
            )}
            {pastGroups.length > 0 && (
              <section aria-label="Past meetings">
                {upcomingList.length > 0 && <SectionHeading label="Past meetings" />}
                {pastGroups.map((g) => (
                  <div key={g.heading}>
                    <div className="px-5 pb-1 pt-4 text-[12px] font-bold text-[#374151] dark:text-[#D4D4D4]">{g.heading}</div>
                    {g.items.map((m) => (
                      <MeetingRow key={m.id} m={m} isNext={false} onOpen={() => setSelectedId(m.id)} />
                    ))}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      <MeetingDetailSheet
        meetingId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={loadMeetings}
      />
    </div>
  );
}

// ─── ROW ──────────────────────────────────────────────────────────────────────
// Fixed columns so every row lines up: date tile · title + details · status · chevron.
function MeetingRow({ m, isNext, onOpen }: { m: MeetingRecordMock; isNext: boolean; onOpen: () => void }) {
  const upcoming = isUpcoming(m.meeting_date);
  const agendaCount = m._count?.agenda_items ?? m.agenda_items?.length ?? 0;
  const cancelled = m.status === "CANCELLED";
  const needsMinutes = !upcoming && m.status === "COMPLETED" && !m.minutes?.trim();
  const title = m.title || meetingTypeLabel(m.meeting_type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[56px_minmax(0,1fr)_16px] items-center gap-x-4 gap-y-2 border-b border-[#F4F5F7] px-5 py-3.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB] focus-visible:bg-[#F9FAFB] focus-visible:outline-none dark:border-[#262626] dark:hover:bg-[#1F1F1F] dark:focus-visible:bg-[#1F1F1F] sm:grid-cols-[56px_minmax(0,1fr)_120px_16px]"
    >
      <DateTile iso={m.meeting_date} highlight={isNext} />

      <div className="min-w-0">
        <p className={`truncate text-[13px] font-bold ${cancelled ? "text-[#9CA3AF] line-through dark:text-[#737373]" : "text-[#1F2937] dark:text-white"}`}>
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
          <TypeLabel type={m.meeting_type} />
          <span className="flex items-center gap-1 tabular-nums">
            <Clock size={11} />
            {formatISOTime(m.meeting_date)}
            {upcoming && <span className="text-[#9CA3AF] dark:text-[#737373]">· {relativeDay(m.meeting_date, new Date())}</span>}
          </span>
          {m.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{m.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <ListChecks size={11} />
            {agendaCount === 0 ? "No agenda" : `${agendaCount} agenda item${agendaCount === 1 ? "" : "s"}`}
          </span>
          {needsMinutes && (
            <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
              <FileWarning size={11} />
              Minutes not encoded
            </span>
          )}
        </div>
        {/* On phones the status sits under the details instead of in its own column. */}
        <div className="mt-2 sm:hidden">
          <StatusBadge status={m.status} />
        </div>
      </div>

      <div className="hidden justify-end sm:flex">
        <StatusBadge status={m.status} />
      </div>

      <ChevronRight size={16} className="text-[#D1D5DB] dark:text-[#525252]" />
    </button>
  );
}