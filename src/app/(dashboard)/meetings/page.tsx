"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_MEETINGS,
  MeetingRecordMock,
  meetingTypeLabel,
  formatISODate,
  formatISOTime,
  isUpcoming,
  minutesPreview,
} from "@/lib/mock/meetings";

interface FilterState {
  meeting_type: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = { meeting_type: "", date_from: "", date_to: "" };

export default function AssemblyListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [meetings] = useState<MeetingRecordMock[]>(MOCK_MEETINGS);
  const [loading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [meetings, setMeetings] = useState<MeetingRecordMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadMeetings() {
  //     setLoading(true);
  //     try {
  //       const params = new URLSearchParams({ limit: "50" });
  //       if (filters.meeting_type) params.set("meeting_type", filters.meeting_type);
  //       if (filters.date_from) params.set("date_from", filters.date_from);
  //       if (filters.date_to) params.set("date_to", filters.date_to);
  //
  //       const res = await fetch(`/api/meetings?${params}`);
  //       const data = await res.json();
  //       setMeetings(data.meetings ?? []);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadMeetings();
  // }, [filters]);

  const filtered = useMemo(() => {
    return meetings
      .filter((m) => {
        if (filters.meeting_type && m.meeting_type !== filters.meeting_type) return false;
        if (filters.date_from && m.meeting_date.slice(0, 10) < filters.date_from) return false;
        if (filters.date_to && m.meeting_date.slice(0, 10) > filters.date_to) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${meetingTypeLabel(m.meeting_type)} ${m.minutes ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  }, [meetings, search, filters]);

  const stats = useMemo(() => {
    const now = new Date();
    const sb = meetings.filter((m) => m.meeting_type === "SB_MEETING").length;
    const assembly = meetings.filter((m) => m.meeting_type === "BARANGAY_ASSEMBLY").length;
    const upcoming = meetings.filter((m) => isUpcoming(m.meeting_date)).length;
    const thisYear = meetings.filter((m) => new Date(m.meeting_date).getFullYear() === now.getFullYear()).length;
    return { total: meetings.length, sb, assembly, upcoming, thisYear };
  }, [meetings]);

  const activeFilterCount = (filters.meeting_type ? 1 : 0) + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Assembly / Meeting Records"
        subtitle="SB meetings and barangay assemblies, with minutes"
        actions={
          <button
            onClick={() => router.push("/meetings/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            New Meeting Record
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
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meeting type or minutes"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-72 space-y-3 rounded-xl border border-[#E9EAEC] bg-white p-4 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#1F2937]">Filters</span>
              <button onClick={() => setShowFilter(false)}>
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Type
              </label>
              <select
                value={filters.meeting_type}
                onChange={(e) => setFilters((f) => ({ ...f, meeting_type: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] outline-none focus:border-[#3B82F6]"
              >
                <option value="">All Types</option>
                <option value="SB_MEETING">SB Meeting</option>
                <option value="BARANGAY_ASSEMBLY">Barangay Assembly</option>
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

      {/* Meetings list */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
            return (
              <button
                key={m.id}
                onClick={() => router.push(`/meetings/${m.id}`)}
                className="flex w-full items-center gap-4 border-b border-[#F4F5F7] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#F9FAFB]"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    m.meeting_type === "SB_MEETING" ? "bg-[#EBF3FF]" : "bg-[#D1FAE5]"
                  }`}
                >
                  {m.meeting_type === "SB_MEETING" ? (
                    <Gavel size={18} className="text-[#1D4ED8]" />
                  ) : (
                    <Megaphone size={18} className="text-[#059669]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[#1F2937]">{meetingTypeLabel(m.meeting_type)}</p>
                    {upcoming && (
                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#D97706]">
                        Upcoming
                      </span>
                    )}
                    {!m.minutes && !upcoming && (
                      <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#DC2626]">
                        Minutes Pending
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF]">
                    {preview ?? "No minutes encoded yet"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-[#374151]">{formatISODate(m.meeting_date)}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{formatISOTime(m.meeting_date)}</p>
                </div>

                <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-[#9CA3AF] sm:flex">
                  <FileText size={12} />
                  {m.recorder.username}
                </div>

                <ChevronRight size={16} className="shrink-0 text-[#D1D5DB]" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}