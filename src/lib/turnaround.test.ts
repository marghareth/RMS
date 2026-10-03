// FILE: src/lib/turnaround.test.ts
import { describe, it, expect } from 'vitest';
import { durationStats, computeTurnaround, formatDuration, HOUR_MS, DAY_MS } from './turnaround';

const MIN = 60_000;
const t0 = new Date('2026-10-01T08:00:00Z');
const after = (ms: number) => new Date(t0.getTime() + ms);
const cert = (type: string, ms: number | null) => ({
  certificate_type: type,
  requested_at: t0,
  issued_at: ms === null ? null : after(ms),
});

describe('durationStats', () => {
  it('returns all-null stats for no data (never NaN)', () => {
    expect(durationStats([])).toEqual({
      count: 0, averageMs: null, medianMs: null, minMs: null, maxMs: null, p90Ms: null,
    });
  });

  it('computes average, min and max', () => {
    const s = durationStats([10 * MIN, 20 * MIN, 60 * MIN]);
    expect(s).toMatchObject({ count: 3, averageMs: 30 * MIN, minMs: 10 * MIN, maxMs: 60 * MIN });
  });

  it('median: middle value for odd counts, mean of the two middle values for even counts', () => {
    expect(durationStats([5 * MIN, 1 * MIN, 9 * MIN]).medianMs).toBe(5 * MIN);
    expect(durationStats([1 * MIN, 2 * MIN, 4 * MIN, 10 * MIN]).medianMs).toBe(3 * MIN);
  });

  it('a single outlier moves the average but barely the median', () => {
    const s = durationStats([10 * MIN, 12 * MIN, 11 * MIN, 9 * MIN, 3 * DAY_MS]);
    expect(s.medianMs).toBe(11 * MIN);
    expect(s.averageMs!).toBeGreaterThan(DAY_MS / 2);
  });

  it('p90 uses nearest-rank (10 values -> the 9th smallest)', () => {
    const s = durationStats(Array.from({ length: 10 }, (_, i) => (i + 1) * MIN));
    expect(s.p90Ms).toBe(9 * MIN);
  });

  it('handles a single value', () => {
    expect(durationStats([7 * MIN])).toEqual({
      count: 1, averageMs: 7 * MIN, medianMs: 7 * MIN, minMs: 7 * MIN, maxMs: 7 * MIN, p90Ms: 7 * MIN,
    });
  });

  it('does not mutate its input', () => {
    const input = [3, 1, 2];
    durationStats(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('computeTurnaround', () => {
  it('measures issued_at − requested_at', () => {
    const r = computeTurnaround([cert('RESIDENCY', 30 * MIN), cert('RESIDENCY', 90 * MIN)]);
    expect(r.overall).toMatchObject({ count: 2, averageMs: 60 * MIN, minMs: 30 * MIN, maxMs: 90 * MIN });
    expect(r.anomalies).toBe(0);
  });

  it('allows a zero-length turnaround (walk-in released immediately)', () => {
    const r = computeTurnaround([cert('RESIDENCY', 0)]);
    expect(r.overall.count).toBe(1);
    expect(r.overall.minMs).toBe(0);
  });

  it('excludes — and reports — rows released BEFORE they were requested, or with no release time', () => {
    const r = computeTurnaround([cert('RESIDENCY', 60 * MIN), cert('RESIDENCY', -5 * MIN), cert('RESIDENCY', null)]);
    expect(r.overall.count).toBe(1);
    expect(r.overall.averageMs).toBe(60 * MIN);
    expect(r.anomalies).toBe(2);
  });

  it('breaks results down by certificate type, most requests first', () => {
    const r = computeTurnaround([
      cert('CLEARANCE', 2 * HOUR_MS),
      cert('RESIDENCY', 10 * MIN), cert('RESIDENCY', 20 * MIN), cert('RESIDENCY', 30 * MIN),
    ]);
    expect(r.byType.map((t) => t.type)).toEqual(['RESIDENCY', 'CLEARANCE']);
    expect(r.byType[0].stats).toMatchObject({ count: 3, averageMs: 20 * MIN, minMs: 10 * MIN, maxMs: 30 * MIN });
    expect(r.byType[1].stats.averageMs).toBe(2 * HOUR_MS);
  });

  it('per-type counts add up to the overall count', () => {
    const r = computeTurnaround([cert('A', MIN), cert('B', MIN), cert('B', 2 * MIN), cert('C', 3 * MIN)]);
    expect(r.byType.reduce((n, t) => n + t.stats.count, 0)).toBe(r.overall.count);
  });

  it('reports the share released within 24 hours (inclusive)', () => {
    const r = computeTurnaround([cert('A', HOUR_MS), cert('A', DAY_MS), cert('A', DAY_MS + MIN), cert('A', 3 * DAY_MS)]);
    expect(r.withinOneDayPct).toBe(50);
  });

  it('empty input -> empty report with null (not 0) rate', () => {
    const r = computeTurnaround([]);
    expect(r.overall.count).toBe(0);
    expect(r.withinOneDayPct).toBeNull();
    expect(r.byType).toEqual([]);
    expect(r.anomalies).toBe(0);
  });
});

describe('formatDuration', () => {
  it.each([
    [null, '\u2014'],
    [undefined, '\u2014'],
    [0, '< 1 min'],
    [59_000, '< 1 min'],
    [60_000, '1 min'],
    [45 * MIN, '45 min'],
    [60 * MIN, '1 h'],
    [90 * MIN, '1 h 30 min'],
    [23 * HOUR_MS + 59 * MIN, '23 h 59 min'],
    [DAY_MS, '1 d'],
    [DAY_MS + 4 * HOUR_MS, '1 d 4 h'],
    [3 * DAY_MS, '3 d'],
    [2 * DAY_MS + 20 * MIN, '2 d'],      // minutes are dropped past one day
    [2 * DAY_MS + 40 * MIN, '2 d 1 h'],  // ...rounded to the nearest hour
  ])('%s -> %s', (ms, expected) => expect(formatDuration(ms as number | null)).toBe(expected));
});