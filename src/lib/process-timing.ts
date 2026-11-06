// FILE: src/lib/process-timing.ts
//
// Processing time (Nov 2026). Each request form measures how long it was
// open (useFormTimer) and sends that as `form_seconds` with the request;
// the API turns it into form_opened_at = now − form_seconds. Measuring an
// elapsed time on the browser (rather than sending the browser's clock
// time) means a PC with a wrong clock can't skew the results.
//
// The steps the Processing Time report shows:
//   Encoding    form opened → filed            (staff typing it in)
//   Waiting     filed → processing started     (in the queue)
//   Processing  processing started → released (preparing / signing)
//   Total       form opened (or filed) → released
// Barangay IDs, blotter cases and borrowings are done in one sitting, so
// for those only Encoding (and, for IDs, time to first print) applies.

/** A form left open longer than this (e.g. overnight) isn't counted as encoding time. */
export const MAX_FORM_SECONDS = 4 * 60 * 60;

/** form_opened_at for a request saved at `now`, or null if the form time is missing or implausible. */
export function formOpenedAt(raw: unknown, now: Date = new Date()): Date | null {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>).form_seconds : undefined;
  const secs = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(secs) || secs < 0 || secs > MAX_FORM_SECONDS) return null;
  return new Date(now.getTime() - Math.round(secs * 1000));
}

/** Milliseconds from a to b, or null when either is missing or b is before a. */
export function span(a: Date | string | null | undefined, b: Date | string | null | undefined): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/** "45s", "3m 20s", "2h 05m", "1d 4h". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Minutes with two decimals, for spreadsheets (blank when unknown). */
export function minutes(ms: number | null | undefined): number | null {
  return ms === null || ms === undefined ? null : Math.round((ms / 60000) * 100) / 100;
}

export interface DurationStats {
  count: number;
  average: number | null;
  median: number | null;
  fastest: number | null;
  slowest: number | null;
}

export function durationStats(values: (number | null)[]): DurationStats {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length === 0) return { count: 0, average: null, median: null, fastest: null, slowest: null };
  const mid = Math.floor(v.length / 2);
  return {
    count: v.length,
    average: v.reduce((s, x) => s + x, 0) / v.length,
    median: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2,
    fastest: v[0],
    slowest: v[v.length - 1],
  };
}