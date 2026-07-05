"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IdCard,
  CalendarDays,
  CalendarRange,
  AlertTriangle,
  Search,
  Plus,
  ChevronRight,
  Printer,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_BARANGAY_IDS,
  BarangayIdMock,
  residentFullName,
  calcAge,
  formatISODate,
  formatShortDate,
  expiryDate,
  isExpired,
} from "@/lib/mock/barangayId";

export default function BarangayIdListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [ids] = useState<BarangayIdMock[]>(MOCK_BARANGAY_IDS);
  const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [ids, setIds] = useState<BarangayIdMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadIds() {
  //     setLoading(true);
  //     try {
  //       const res = await fetch("/api/barangay-id?limit=50");
  //       const data = await res.json();
  //       setIds(data.ids ?? []);
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadIds();
  // }, []);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(ids[0]?.id ?? null);

  const filtered = useMemo(() => {
    return ids.filter((i) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${i.id_number} ${residentFullName(i.resident)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ids, search]);

  const selected = ids.find((i) => i.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = ids.filter((i) => {
      const d = new Date(i.issued_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = ids.filter((i) => new Date(i.issued_date).getFullYear() === now.getFullYear()).length;
    const expired = ids.filter((i) => isExpired(i.issued_date)).length;
    return { total: ids.length, thisMonth, thisYear, expired };
  }, [ids]);

  return (
    <div>
      <PageHeader
        title="Barangay ID"
        subtitle="Issue and manage resident barangay identification cards"
        actions={
          <button
            onClick={() => router.push("/barangay_id/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            Issue New ID
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Issued" value={stats.total} sub="All-time records" icon={IdCard} color="blue" />
        <StatCard label="This Month" value={stats.thisMonth} sub="Issued this month" icon={CalendarDays} color="green" />
        <StatCard label="This Year" value={stats.thisYear} sub="Issued this year" icon={CalendarRange} color="amber" />
        <StatCard label="Expired" value={stats.expired} sub="Past 3-year validity" icon={AlertTriangle} color="red" />
      </div>

      <div className="flex min-h-[calc(100vh-280px)] gap-5">
        {/* ── Left: list panel ── */}
        <div className="flex w-85 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
          <div className="border-b border-[#E9EAEC] px-4 pt-4 pb-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID number or name"
                className="w-full rounded-xl border border-transparent bg-[#F4F5F7] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-[12px] text-[#9CA3AF]">No barangay IDs found</p>
            ) : (
              filtered.map((i) => {
                const active = selected?.id === i.id;
                const expired = isExpired(i.issued_date);
                return (
                  <button
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] px-4 py-3 text-left transition ${
                      active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937]"}`}>
                        {residentFullName(i.resident)}
                      </p>
                      <p className={`mt-0.5 truncate font-mono text-[11px] ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                        {i.id_number}
                        {expired && " · Expired"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: ID card preview ── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white">
          {!selected ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={IdCard}
                title="No ID selected"
                description="Select a barangay ID from the list, or issue a new one."
              />
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[13px] font-bold text-[#1F2937]">{selected.id_number}</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Issued {formatISODate(selected.issued_date)} by {selected.issuer.username}
                  </p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]">
                  <Printer size={14} />
                  Print ID
                </button>
              </div>

              {/* ── ID CARD VISUAL ── */}
              <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#E9EAEC] shadow-md">
                {/* Header */}
                <div className="flex items-center gap-3 bg-[#3B82F6] px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#3B82F6" />
                    </svg>
                  </div>
                  <div className="min-w-0 text-white">
                    <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
                      Republic of the Philippines
                    </p>
                    <p className="truncate text-[13px] font-black uppercase tracking-wide">Barangay Quisol</p>
                    <p className="text-[9px] opacity-80">Danao City, Cebu</p>
                  </div>
                </div>

                {/* Body */}
                <div className="flex gap-4 bg-white p-5">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-[#E9EAEC] bg-[#F4F5F7] text-[10px] text-[#9CA3AF]">
                    Photo
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Name</p>
                    <p className="truncate text-[14px] font-black uppercase text-[#1F2937]">
                      {residentFullName(selected.resident)}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Address</p>
                        <p className="truncate text-[10px] text-[#374151]">{selected.resident.address}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Birthdate</p>
                        <p className="text-[10px] text-[#374151]">{formatShortDate(selected.resident.birthdate)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Age / Sex</p>
                        <p className="text-[10px] text-[#374151]">
                          {calcAge(selected.resident.birthdate)} / {selected.resident.sex === "MALE" ? "M" : "F"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Civil Status</p>
                        <p className="text-[10px] text-[#374151]">{selected.resident.civil_status}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[#E9EAEC] bg-[#F9FAFB] px-5 py-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold text-[#1F2937]">{selected.id_number}</p>
                    <p className="text-[8px] text-[#9CA3AF]">
                      Valid until {formatShortDate(expiryDate(selected.issued_date))}
                    </p>
                  </div>
                  {isExpired(selected.issued_date) ? (
                    <span className="rounded-full bg-[#FEE2E2] px-2 py-1 text-[9px] font-bold uppercase text-[#DC2626]">
                      Expired
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#D1FAE5] px-2 py-1 text-[9px] font-bold uppercase text-[#059669]">
                      Valid
                    </span>
                  )}
                </div>
              </div>

              <p className="mx-auto mt-3 max-w-md text-center text-[10px] text-[#9CA3AF]">
                Note: the 3-year validity shown is a UI convenience — the schema doesn&apos;t store an expiry date, so
                this is derived from the issue date rather than a real database field.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}