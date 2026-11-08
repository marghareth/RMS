// FILE: src/app/(dashboard)/reports/registries/page.tsx
"use client";

// Special registries report: senior citizens, PWD and 4Ps beneficiaries.
// Laid out like the other list pages: one summary line under the title,
// tabs with counts, a quiet per-purok breakdown, then the full name list.

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import {
  LIST_CARD,
  THEAD_ROW,
  TH,
  TH_RIGHT,
  TR,
  ListTabs,
  ListSearch,
  ListToolbar,
  ListSummary,
} from "@/components/shared/ListUI";

// ─── Types (shape of GET /api/reports?type=registries) ───────────────────────
interface Count { purok: string; count: number }
interface Person { id: number; name: string; age: number; purok: string; sex: string }
interface PwdPerson extends Person { disability: string }
interface RegistriesData {
  seniors: { total: number; byPurok: Count[] };
  pwd: { total: number; byType: { type: string; count: number }[]; byPurok: Count[] };
  fourPs: { total: number; households: number; byPurok: Count[] };
  seniorList: Person[];
  pwdList: PwdPerson[];
  fourPsList?: Person[];
}

type Tab = "seniors" | "pwd" | "fourps";

const YEARS = (() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2];
})();

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ─── Breakdown: one row per group with a thin bar, in a single brand color ──
function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[13px] font-semibold text-[#1F2937] dark:text-white">{title}</p>
      {rows.length === 0 ? (
        <p className="py-2 text-[12.5px] text-[#9CA3AF] dark:text-[#737373]">No one registered yet.</p>
      ) : (
        <ul>
          {rows.map((r) => {
            const share = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem_2.75rem] items-center gap-3 py-1.5">
                <span className="truncate text-[13px] text-[#374151] dark:text-[#D4D4D4]">{r.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#F1F2F4] dark:bg-[#262626]">
                  <span
                    className="block h-full rounded-full bg-(--brand) dark:bg-[#60A5FA]"
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right text-[13px] font-medium tabular-nums text-[#1F2937] dark:text-white">{r.count}</span>
                <span className="text-right text-[12px] tabular-nums text-[#9CA3AF] dark:text-[#737373]">{share}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function RegistriesReportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("seniors");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");

  const [data, setData] = useState<RegistriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [prevYear, setPrevYear] = useState(year);
  if (year !== prevYear) {
    setPrevYear(year);
    setData(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let ignore = false;
    fetch(`/api/reports?type=registries&year=${year}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((json) => {
        if (ignore) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [year]);

  // Rows for the current tab, filtered by the search box.
  const people = useMemo(() => {
    if (!data) return [] as (Person | PwdPerson)[];
    const list: (Person | PwdPerson)[] =
      tab === "seniors" ? data.seniorList : tab === "pwd" ? data.pwdList : data.fourPsList ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      `${p.name} ${p.purok} ${"disability" in p ? p.disability : ""}`.toLowerCase().includes(q)
    );
  }, [data, tab, search]);

  function exportPdf() {
    const a = document.createElement("a");
    a.href = `/api/pdf/report/registries?year=${year}`;
    a.download = `registries-report-${year}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const header = (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <button
          onClick={() => router.push("/reports")}
          aria-label="Back to reports"
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#1B2430] dark:text-white">Special registries</h1>
          <p className="mt-0.5 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            {data ? (
              <ListSummary
                items={[
                  plural(data.seniors.total, "senior citizen", "senior citizens"),
                  `${data.pwd.total} PWD`,
                  plural(data.fourPs.total, "4Ps beneficiary", "4Ps beneficiaries"),
                  `registered by the end of ${year}`,
                ]}
              />
            ) : (
              "Senior citizens, PWD and 4Ps beneficiaries per purok"
            )}
          </p>
        </div>
      </div>
      <div data-tour="page-reports-registries-controls" className="flex items-center gap-2 print:hidden">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Year"
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#1F2937] outline-none focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={exportPdf}
          className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-(--brand-hover)"
        >
          <Download size={14} /> Export PDF
        </button>
      </div>
    </div>
  );

  if (loading || error || !data) {
    return (
      <div>
        {header}
        <div className={`${LIST_CARD} flex h-48 items-center justify-center text-[13px]`}>
          {loading ? (
            <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">Loading registries…</span>
          ) : (
            <span className="text-[#DC2626] dark:text-[#F87171]">Couldn&apos;t load registry data. Please try again.</span>
          )}
        </div>
      </div>
    );
  }

  const purokRows = (rows: Count[]) => rows.map((r) => ({ label: r.purok, count: r.count }));
  // Counted from the name list, so it always agrees with the table below.
  const sexRows = (list: Person[]) => {
    const m = new Map<string, number>();
    for (const p of list) m.set(p.sex, (m.get(p.sex) ?? 0) + 1);
    return Array.from(m, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  };
  const isPwd = tab === "pwd";

  return (
    <div>
      {header}

      <div className={LIST_CARD}>
        <ListToolbar
          left={
            <div data-tour="page-reports-registries-tabs">
              <ListTabs
                label="Registry"
                value={tab}
                onChange={(k) => {
                  setTab(k);
                  setSearch("");
                }}
                tabs={[
                  { key: "seniors", label: "Senior citizens", count: data.seniors.total },
                  { key: "pwd", label: "PWD", count: data.pwd.total },
                  { key: "fourps", label: "4Ps beneficiaries", count: data.fourPs.total },
                ]}
              />
            </div>
          }
          right={<ListSearch value={search} onChange={setSearch} placeholder="Search name or purok" />}
        />

        <div data-tour="page-reports-registries-content">
          {/* Breakdown */}
          <div className="border-b border-[#F0F1F3] px-4 py-4 dark:border-[#262626]">
            {tab === "seniors" && (
              <div className="grid gap-6 md:grid-cols-2">
                <Breakdown title="By purok" rows={purokRows(data.seniors.byPurok)} total={data.seniors.total} />
                <Breakdown title="By sex" rows={sexRows(data.seniorList)} total={data.seniorList.length} />
              </div>
            )}
            {tab === "pwd" && (
              <div className="grid gap-6 md:grid-cols-2">
                <Breakdown title="By purok" rows={purokRows(data.pwd.byPurok)} total={data.pwd.total} />
                <Breakdown
                  title="By disability type"
                  rows={data.pwd.byType.map((t) => ({ label: t.type, count: t.count }))}
                  total={data.pwd.total}
                />
              </div>
            )}
            {tab === "fourps" && (
              <>
                <p className="mb-3 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                  {plural(data.fourPs.total, "beneficiary", "beneficiaries")} in{" "}
                  {plural(data.fourPs.households, "household", "households")}
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <Breakdown title="By purok" rows={purokRows(data.fourPs.byPurok)} total={data.fourPs.total} />
                  <Breakdown title="By sex" rows={sexRows(data.fourPsList ?? [])} total={(data.fourPsList ?? []).length} />
                </div>
              </>
            )}
          </div>

          {/* Name list */}
          {people.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[#9CA3AF] dark:text-[#737373]">
              {search ? "No one matches that search." : "No one is on this registry yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Name</th>
                    {isPwd && <th className={TH}>Disability</th>}
                    <th className={TH}>Purok</th>
                    <th className={TH}>Sex</th>
                    <th className={TH_RIGHT}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/residents/${p.id}`)}
                      className={`${TR} cursor-pointer transition hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]`}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1F2937] dark:text-white">{p.name}</td>
                      {isPwd && (
                        <td className="px-4 py-3 text-[13px] text-[#374151] dark:text-[#D4D4D4]">
                          {(p as PwdPerson).disability}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">{p.purok}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">{p.sex}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#374151] dark:text-[#D4D4D4]">{p.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}