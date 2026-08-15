// FILE: src/app/(dashboard)/barangay_id/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
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

  const [ids, setIds] = useState<BarangayIdMock[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
     async function loadIds() {
       setLoading(true);
       try {
         const res = await fetch("/api/barangay-id?limit=50");
         const data = await res.json();
         setIds(data.ids ?? []);
       } catch (e) {
         console.error(e);
       } finally {
         setLoading(false);
       }
     }
     loadIds();
   }, []);

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
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
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
        <div className="flex w-85 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
          <div className="border-b border-[#E9EAEC] dark:border-[#262626] px-4 pt-4 pb-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID number or name"
                className="w-full rounded-xl border border-transparent bg-[#F4F5F7] dark:bg-[#262626] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA] focus:bg-white dark:focus:bg-[#171717]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No barangay IDs found</p>
            ) : (
              filtered.map((i) => {
                const active = selected?.id === i.id;
                const expired = isExpired(i.issued_date);
                return (
                  <button
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] dark:border-[#262626] px-4 py-3 text-left transition ${
                      active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937] dark:text-white"}`}>
                        {residentFullName(i.resident)}
                      </p>
                      <p className={`mt-0.5 truncate font-mono text-[11px] ${active ? "text-blue-100 dark:text-blue-200" : "text-[#9CA3AF] dark:text-[#A3A3A3]"}`}>
                        {i.id_number}
                        {expired && " · Expired"}
                      </p>
                    </div>
                    <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB] dark:text-[#525252]"} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: ID card preview ── */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]">
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
                  <p className="font-mono text-[13px] font-bold text-[#1F2937] dark:text-white">{selected.id_number}</p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                    Issued {formatISODate(selected.issued_date)} by {selected.issuer.username}
                  </p>
                </div>
                {/* Real PDF generation (disabled until API/DB is wired up):
                    window.open(`/api/pdf/barangay-id/${selected.id}`, "_blank")
                    — hits the not-yet-implemented /api/pdf/barangay-id/[id] route. */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] print:hidden"
                >
                  <Printer size={14} />
                  Print ID
                </button>
              </div>

              {/* ── ID CARD VISUAL ── */}
              <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[#E9EAEC] dark:border-[#262626] shadow-md">
                {/* Header */}
                <div className="flex items-center gap-3 bg-[#3B82F6] px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#171717]">
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
                <div className="flex gap-4 bg-white dark:bg-[#171717] p-5">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-[#F4F5F7] dark:bg-[#262626] text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                    Photo
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Name</p>
                    <p className="truncate text-[14px] font-black uppercase text-[#1F2937] dark:text-white">
                      {residentFullName(selected.resident)}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Address</p>
                        <p className="truncate text-[10px] text-[#374151] dark:text-[#D4D4D4]">{selected.resident.household?.address ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Birthdate</p>
                        <p className="text-[10px] text-[#374151] dark:text-[#D4D4D4]">{formatShortDate(selected.resident.birthdate)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Age / Sex</p>
                        <p className="text-[10px] text-[#374151] dark:text-[#D4D4D4]">
                          {calcAge(selected.resident.birthdate)} / {selected.resident.sex === "MALE" ? "M" : "F"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Civil Status</p>
                        <p className="text-[10px] text-[#374151] dark:text-[#D4D4D4]">{selected.resident.civil_status}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[#E9EAEC] dark:border-[#262626] bg-[#F9FAFB] dark:bg-[#171717] px-5 py-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold text-[#1F2937] dark:text-white">{selected.id_number}</p>
                    <p className="text-[8px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                      Valid until {formatShortDate(expiryDate(selected.issued_date))}
                    </p>
                  </div>
                  {isExpired(selected.issued_date) ? (
                    <span className="rounded-full bg-[#FEE2E2] dark:bg-red-500/15 px-2 py-1 text-[9px] font-bold uppercase text-[#DC2626] dark:text-[#F87171]">
                      Expired
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#D1FAE5] dark:bg-emerald-500/15 px-2 py-1 text-[9px] font-bold uppercase text-[#059669] dark:text-[#34D399]">
                      Valid
                    </span>
                  )}
                </div>
              </div>

              <p className="mx-auto mt-3 max-w-md text-center text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">
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