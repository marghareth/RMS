// FILE: src/components/reports/ProcessingTime.tsx
"use client";

// Processing time section of the Certificates report.
//
// Explains three things in plain words, using the numbers themselves:
//   1. what is measured (filed → released, on the clock, nights included)
//   2. where the time goes (waiting in line / being prepared / waiting for
//      pickup), from the step times stamped on each request
//   3. why the figures can read as "hours" even when the office works in
//      minutes (overnight and weekend gaps, unclaimed documents, and a few
//      very slow requests pulling the average up)
//
// Numbers come from src/lib/turnaround.ts via GET /api/reports?type=certificates.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDuration, type StageKey, type TurnaroundReport } from "@/lib/turnaround";
import { LIST_CARD } from "@/components/shared/ListUI";

export interface ProcessingTimeData extends TurnaroundReport {
  open: { count: number; oldestWaitMs: number | null };
}

const STAGE: Record<StageKey, { label: string; what: string; swatch: string }> = {
  waiting: {
    label: "Waiting in line",
    what: "Filed, but nobody has started on it yet.",
    swatch: "bg-[#93A8DE] dark:bg-[#3B5598]",
  },
  preparing: {
    label: "Being prepared",
    what: "From Start processing until the document is first printed.",
    swatch: "bg-(--brand) dark:bg-[#60A5FA]",
  },
  pickup: {
    label: "Ready, waiting for pickup",
    what: "Printed and ready; the requester hasn't come back for it yet.",
    swatch: "bg-[#D1D5DB] dark:bg-[#525252]",
  },
};

const HOUR = 3_600_000;

function Figure({ label, value, hint, strong }: { label: string; value: string; hint: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${
          strong ? "text-[22px] font-semibold text-[#1B2430] dark:text-white" : "text-[17px] font-medium text-[#1F2937] dark:text-[#E5E5E5]"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[12px] leading-snug text-[#9CA3AF] dark:text-[#737373]">{hint}</p>
    </div>
  );
}

export default function ProcessingTime({ data }: { data: ProcessingTimeData }) {
  const [howOpen, setHowOpen] = useState(false);
  const o = data.overall;

  const tracked = data.stagesTracked > 0;
  const biggest = tracked
    ? [...data.stages].sort((a, b) => (b.sharePct ?? 0) - (a.sharePct ?? 0))[0]
    : null;
  const skewed = o.averageMs !== null && o.medianMs !== null && o.averageMs > o.medianMs * 2 && o.averageMs - o.medianMs > HOUR;
  const nextDayPct = data.sameDayPct === null ? null : Math.round((100 - data.sameDayPct) * 10) / 10;

  // The "why" list, built from what the numbers actually show.
  const reasons: { title: string; body: string }[] = [];
  reasons.push({
    title: "The clock keeps running when the office is closed",
    body:
      `Time is counted from filing to release on the calendar, including lunch, nights and weekends. ` +
      (nextDayPct !== null && nextDayPct > 0
        ? `${nextDayPct}% of requests were released on a later day than they were filed, so a request filed at 4 pm and released at 9 am the next day shows as 17 hours even if the work itself took minutes.`
        : `Every request in this period was released the same day it was filed.`),
  });
  if (biggest && biggest.sharePct !== null && biggest.sharePct >= 40) {
    const typical = formatDuration(biggest.stats.medianMs);
    reasons.push(
      biggest.key === "pickup"
        ? {
            title: "Most of the time is after the document is ready",
            body: `${biggest.sharePct}% of the time is spent waiting for the requester to come back. A typical document sits ready for ${typical}. That part depends on the requester, not on the office.`,
          }
        : biggest.key === "waiting"
          ? {
              title: "Most of the time is spent waiting in line",
              body: `${biggest.sharePct}% of the time passes before anyone starts on the request (typically ${typical}). More staff at busy hours, or using Process now for walk-ins, shortens this.`,
            }
          : {
              title: "Most of the time is spent preparing the document",
              body: `${biggest.sharePct}% of the time is between Start processing and printing (typically ${typical}). Waiting for a signature or for requirements usually shows up here.`,
            }
    );
  }
  if (skewed) {
    reasons.push({
      title: "A few slow requests pull the average up",
      body: `The average (${formatDuration(o.averageMs)}) is far above the typical time (${formatDuration(o.medianMs)}) because some requests took much longer — the slowest ${formatDuration(o.maxMs)}. Use the typical time when you say how long a request takes.`,
    });
  }

  return (
    <section data-tour="page-reports-certificates-turnaround" className="mb-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[#1B2430] dark:text-white">Processing time</h2>
        <button
          type="button"
          onClick={() => setHowOpen((v) => !v)}
          aria-expanded={howOpen}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-(--brand-fg) transition hover:bg-(--brand-tint) print:hidden"
        >
          How it&apos;s measured
          <ChevronDown size={14} className={`transition ${howOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {o.count === 0 ? (
        <div className={`${LIST_CARD} px-5 py-6 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]`}>
          No requests were released in this period, so there is no processing time to report.
        </div>
      ) : (
        <div className={LIST_CARD}>
          {/* How it's measured */}
          {howOpen && (
            <div className="border-b border-[#F0F1F3] bg-[#FAFBFC] px-5 py-4 text-[13px] leading-relaxed text-[#374151] dark:border-[#262626] dark:bg-[#1A1A1A] dark:text-[#D4D4D4]">
              <p>
                Each request is timed from the moment it&apos;s <b className="font-semibold">filed</b>{" "}(saved in the system) to the moment
                it&apos;s <b className="font-semibold">released</b>{" "}to the requester. Along the way the system notes when someone clicks
                Start processing and when the document is first printed, which splits the time into three steps:
              </p>
              <ol className="mt-2 grid gap-1 sm:grid-cols-3">
                {(["waiting", "preparing", "pickup"] as StageKey[]).map((k, i) => (
                  <li key={k} className="flex gap-2">
                    <span className="text-[#9CA3AF] dark:text-[#737373]">{i + 1}.</span>
                    <span>
                      <span className="font-medium">{STAGE[k].label}</span> — {STAGE[k].what}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                It is calendar time, not office hours. Only requests released in the selected period are counted; cancelled and
                still-open requests are left out. With Process now, waiting in line is zero because processing starts as soon as
                the request is filed.
              </p>
            </div>
          )}

          {/* Headline in words */}
          <div className="px-5 pt-5">
            <p className="text-[14px] leading-relaxed text-[#374151] dark:text-[#D4D4D4]">
              A typical request is released{" "}
              <b className="font-semibold text-[#1B2430] dark:text-white">{formatDuration(o.medianMs)}</b>{" "}after it&apos;s filed.
              {data.sameDayPct !== null && (
                <>
                  {" "}
                  <b className="font-semibold text-[#1B2430] dark:text-white">{data.sameDayPct}%</b>{" "}are released the same day
                </>
              )}
              {o.p90Ms !== null && <>, and 9 in 10 within {formatDuration(o.p90Ms)}</>}.
            </p>
          </div>

          {/* Figures */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
            <Figure strong label="Typical (median)" value={formatDuration(o.medianMs)} hint="Half take less, half take more" />
            <Figure
              label="Average"
              value={formatDuration(o.averageMs)}
              hint={skewed ? "Pulled up by a few slow requests" : `Across ${o.count} released requests`}
            />
            <Figure label="9 in 10 within" value={formatDuration(o.p90Ms)} hint="Only 1 in 10 takes longer" />
            <Figure label="Fastest" value={formatDuration(o.minMs)} hint="Quickest single request" />
            <Figure label="Slowest" value={formatDuration(o.maxMs)} hint="Longest single request" />
          </div>

          {/* Where the time goes */}
          <div className="border-t border-[#F0F1F3] px-5 py-5 dark:border-[#262626]">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-[#1F2937] dark:text-white">Where the time goes</p>
              {tracked && (
                <p className="text-[12px] text-[#9CA3AF] dark:text-[#737373]">
                  Based on {data.stagesTracked} of {o.count} requests that have every step time
                </p>
              )}
            </div>

            {!tracked ? (
              <p className="text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
                Step times are recorded on requests filed from November 2026 onward. Once some of those are released, this shows how
                long requests wait in line, how long they take to prepare, and how long they sit ready for pickup.
              </p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-[#F1F2F4] dark:bg-[#262626]" role="img" aria-label="Share of time per step">
                  {data.stages.map((s) =>
                    (s.sharePct ?? 0) > 0 ? (
                      <span key={s.key} className={`${STAGE[s.key].swatch} h-full`} style={{ width: `${s.sharePct}%` }} />
                    ) : null
                  )}
                </div>
                <ul className="mt-3 grid gap-3 md:grid-cols-3">
                  {data.stages.map((s) => (
                    <li key={s.key} className="flex gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STAGE[s.key].swatch}`} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1F2937] dark:text-white">
                          {STAGE[s.key].label}
                          <span className="ml-1.5 font-normal tabular-nums text-[#9CA3AF] dark:text-[#737373]">{s.sharePct ?? 0}%</span>
                        </p>
                        <p className="text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                          Typically {formatDuration(s.stats.medianMs)}. {STAGE[s.key].what}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Why it can take hours */}
          {reasons.length > 0 && (
            <div className="border-t border-[#F0F1F3] px-5 py-5 dark:border-[#262626]">
              <p className="mb-2.5 text-[13.5px] font-semibold text-[#1F2937] dark:text-white">Why it can read as hours</p>
              <ul className="grid gap-3 md:grid-cols-3">
                {reasons.map((r) => (
                  <li key={r.title}>
                    <p className="text-[13px] font-medium text-[#1F2937] dark:text-[#E5E5E5]">{r.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">{r.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* By certificate type */}
          <div className="border-t border-[#F0F1F3] dark:border-[#262626]">
            <p className="px-5 pb-1 pt-4 text-[13.5px] font-semibold text-[#1F2937] dark:text-white">By certificate type</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#F0F1F3] dark:border-[#262626]">
                    <th className="px-5 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Certificate</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Released</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Typical</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Average</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Fastest</th>
                    <th className="px-5 py-2.5 text-right text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Slowest</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byType.map((t) => (
                    <tr key={t.type} className="border-b border-[#F4F5F7] last:border-b-0 dark:border-[#262626]">
                      <td className="px-5 py-2.5 text-[13px] font-medium text-[#1F2937] dark:text-white">{t.type}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{t.stats.count}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#1B2430] dark:text-white">
                        {formatDuration(t.stats.medianMs)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{formatDuration(t.stats.averageMs)}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{formatDuration(t.stats.minMs)}</td>
                      <td className="px-5 py-2.5 text-right text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3]">{formatDuration(t.stats.maxMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footnote */}
          <p className="border-t border-[#F0F1F3] px-5 py-3 text-[12px] leading-relaxed text-[#9CA3AF] dark:border-[#262626] dark:text-[#737373]">
            Counts requests released in the selected period. Cancelled and still-open requests aren&apos;t included
            {data.open.count > 0 && (
              <>
                ; {data.open.count} {data.open.count === 1 ? "request is" : "requests are"} open right now
                {data.open.oldestWaitMs !== null && <>, the oldest waiting {formatDuration(data.open.oldestWaitMs)}</>}
              </>
            )}
            .
            {data.anomalies > 0 && (
              <span className="text-[#B45309] dark:text-[#FBBF24]">
                {" "}
                {data.anomalies} {data.anomalies === 1 ? "record was" : "records were"} left out because its release time is earlier
                than its filing time — check {data.anomalies === 1 ? "it" : "those"}.
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}