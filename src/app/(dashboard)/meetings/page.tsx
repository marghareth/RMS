"use client";
// FILE: src/app/(dashboard)/meetings/page.tsx

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
  FileText,
  MapPin,
  ListChecks,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import MeetingDetailSheet from "@/components/meetings/MeetingDetailSheet";
import {
  MeetingRecordMock,
  meetingTypeLabel,
  formatISODate,
  formatISOTime,
  isUpcoming,
  minutesPreview,
  MEETING_STATUSES,
} from "@/lib/mock/meetings";

interface FilterState {
  meeting_type: string;
  status: string;
  location: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { meeting_type: "", status: "", location: "", date_from: "", date_to: "" };

export default function AssemblyListPage() {
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
      const params = new URLSearchParams({ limit: "50" });
      if (filters.meeting_type) params.set("meeting_type", filters.meeting_type);
      if (filters.status) params.set("status", filters.status);
      if (filters.location) params.set("location", filters.location);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (search.trim()) params.set("title", search.trim());

      const res = await fetch(`/api/meetings?${params}`);
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

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
          <button
            onClick={() => router.push("/meetings/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            <Plus size={15} />
            New Meeting
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="SB Meetings" value={stats.sb} sub="Sangguniang Barangay" icon={Gavel} color="blue" />
        <StatCard label="Barangay Assemblies" value={stats.assembly} sub="Community-wide meetings" icon={Megaphone} color="green" />
        <StatCard label="Upcoming" value={stats.upcoming} sub="Scheduled ahead" icon={CalendarClock} color="amber" />
        <StatCard label="Recorded This Year" value={stats.thisYear} sub="Total meeting records" icon={Users2} color="red" />
      </div>

      {/* Search + filters */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, type, location, or minutes"
            className="w-full rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                  className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-2 py-2 text-[12px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
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
                className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-[12px] font-semibold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meetings list */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No meeting records found"
            description="Try adjusting your search or filters, or create a new meeting record."
          />
        ) : (
          filtered.map((m) => {
            const upcoming = isUpcoming(m.meeting_date);
            const preview = minutesPreview(m.minutes);
            const agendaCount = m._count?.agenda_items ?? m.agenda_items?.length ?? 0;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="flex w-full items-center gap-4 border-b border-[#F4F5F7] dark:border-[#262626] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    m.meeting_type === "SB_MEETING" ? "bg-[#EBF3FF] dark:bg-blue-500/15" : "bg-[#D1FAE5] dark:bg-emerald-500/15"
                  }`}
                >
                  {m.meeting_type === "SB_MEETING" ? (
                    <Gavel size={18} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
                  ) : (
                    <Megaphone size={18} className="text-[#059669] dark:text-[#34D399]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-bold text-[#1F2937] dark:text-white">
                      {m.title || meetingTypeLabel(m.meeting_type)}
                    </p>
                    <StatusBadge status={m.status} />
                    {upcoming && m.status === "SCHEDULED" && (
                      <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#D97706] dark:text-[#FBBF24]">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-3 truncate text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                    <span>{meetingTypeLabel(m.meeting_type)}</span>
                    {m.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {m.location}
                      </span>
                    )}
                    {agendaCount > 0 && (
                      <span className="flex items-center gap-1">
                        <ListChecks size={11} />
                        {agendaCount} item{agendaCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                  {!m.title && (
                    <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                      {preview ?? "No minutes encoded yet"}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-[#374151] dark:text-[#D4D4D4]">{formatISODate(m.meeting_date)}</p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{formatISOTime(m.meeting_date)}</p>
                </div>

                <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] sm:flex">
                  <FileText size={12} />
                  {m.recorder.username}
                </div>

                <ChevronRight size={16} className="shrink-0 text-[#D1D5DB] dark:text-[#525252]" />
              </button>
            );
          })
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