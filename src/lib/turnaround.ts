// FILE: src/lib/turnaround.ts
//
// Certificate turnaround time: how long a request takes from being FILED
// (Certificate.requested_at, stamped when the request is created) to being
// RELEASED (Certificate.issued_at, stamped only at the moment of release —
// see api/certificates/[id]/process and bulk-release). This is the measured
// counterpart to the "timeliness in service delivery" survey indicator.
//
// Definitions
//   turnaround = issued_at − requested_at, in CALENDAR time (nights and
//                weekends included — the system doesn't know office hours).
//   counted    = RELEASED requests released inside the selected period.
//   excluded   = requests released *before* they were requested (bad data,
//                e.g. back-filled records): reported as `anomalies`, never
//                averaged in, so they can't drag the figures down silently.
//   Cancelled and still-open requests have no release time and are not
//   part of the statistics (open requests are reported separately).
//
// Why median and 90th percentile as well as average/min/max: one request
// left over a long weekend can double an average; the median shows the
// typical wait and p90 the "slow end" without being skewed by it.
//
// Limitation: the schema has no timestamp for PENDING → PROCESSING, so total
// turnaround can't be split into "waiting to be started" vs "being worked on".
//
// Pure module (no Prisma / Node APIs): unit-testable and usable anywhere.

export interface TurnaroundInput {
  certificate_type: string;
  requested_at: Date;
  issued_at: Date | null;
}

/** Statistics over a set of durations (milliseconds). All null when there are none. */
export interface DurationStats {
  count: number;
  averageMs: number | null;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  p90Ms: number | null;
}

export interface TurnaroundReport {
  overall: DurationStats;
  /** % of counted requests released within 24 hours of being filed (null if none). */
  withinOneDayPct: number | null;
  byType: { type: string; stats: DurationStats }[];
  /** Rows left out because issued_at is missing or earlier than requested_at. */
  anomalies: number;
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

const EMPTY: DurationStats = {
  count: 0, averageMs: null, medianMs: null, minMs: null, maxMs: null, p90Ms: null,
};

/** Nearest-rank percentile on an ASCENDING array. */
function percentile(sorted: number[], p: number): number {
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export function durationStats(durationsMs: number[]): DurationStats {
  if (durationsMs.length === 0) return { ...EMPTY };
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    count: n,
    averageMs: Math.round(sum / n),
    medianMs: Math.round(median),
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    p90Ms: percentile(sorted, 90),
  };
}

export function computeTurnaround(rows: TurnaroundInput[]): TurnaroundReport {
  const all: number[] = [];
  const perType = new Map<string, number[]>();
  let anomalies = 0;

  for (const row of rows) {
    if (!row.issued_at) { anomalies++; continue; }
    const ms = row.issued_at.getTime() - row.requested_at.getTime();
    if (!Number.isFinite(ms) || ms < 0) { anomalies++; continue; }
    all.push(ms);
    (perType.get(row.certificate_type) ?? perType.set(row.certificate_type, []).get(row.certificate_type)!).push(ms);
  }

  const withinOneDay = all.filter((ms) => ms <= DAY_MS).length;
  return {
    overall: durationStats(all),
    withinOneDayPct: all.length === 0 ? null : Math.round((withinOneDay / all.length) * 1000) / 10,
    byType: [...perType.entries()]
      .map(([type, ms]) => ({ type, stats: durationStats(ms) }))
      .sort((a, b) => b.stats.count - a.stats.count || a.type.localeCompare(b.type)),
    anomalies,
  };
}

/**
 * Human-readable duration: "—", "< 1 min", "45 min", "3 h 15 min", "2 d 4 h".
 * Shows at most two units; rounds to the nearest minute / hour for display.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "\u2014";
  if (ms < 60_000) return "< 1 min";

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  if (ms < DAY_MS) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  const totalHours = Math.round(ms / HOUR_MS);
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  return h === 0 ? `${d} d` : `${d} d ${h} h`;
}