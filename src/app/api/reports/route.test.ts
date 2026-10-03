// FILE: src/app/api/reports/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => ({
  prisma: {
    certificate: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));

const MIN = 60_000;
const HOUR = 60 * MIN;
const req = (qs = 'type=certificates&year=2026&month=10') =>
  new NextRequest(`http://localhost/api/reports?${qs}`);

const requested = new Date('2026-10-05T08:00:00Z');
const released = (type: string, afterMs: number | null) => ({
  certificate_type: type,
  requested_at: requested,
  issued_at: afterMs === null ? null : new Date(requested.getTime() + afterMs),
});

/** findMany is called three times; tell them apart by their arguments. */
function mockFindMany(releasedRows: unknown[]) {
  (prisma.certificate.findMany as any).mockImplementation(async (args: any) => {
    if (args?.where?.status === 'RELEASED') return releasedRows;
    if (args?.include) return []; // "recent" list
    return [];                    // issued_at-per-month rows
  });
}

describe('GET /api/reports?type=certificates — turnaround time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
    (prisma.certificate.count as any).mockResolvedValue(0);
    (prisma.certificate.groupBy as any).mockResolvedValue([]);
    (prisma.certificate.aggregate as any).mockResolvedValue({ _count: 0, _min: { requested_at: null } });
    mockFindMany([]);
  });
  afterEach(() => vi.useRealTimers());

  it('returns average / median / min / max over released requests, plus a per-type breakdown with friendly labels', async () => {
    mockFindMany([
      released('RESIDENCY', 30 * MIN),
      released('RESIDENCY', 90 * MIN),
      released('GOOD_MORAL', 6 * HOUR),
    ]);
    const body = await (await GET(req())).json();
    const t = body.turnaround;

    expect(t.overall).toMatchObject({
      count: 3,
      minMs: 30 * MIN,
      maxMs: 6 * HOUR,
      medianMs: 90 * MIN,
      averageMs: Math.round((30 * MIN + 90 * MIN + 6 * HOUR) / 3),
    });
    expect(t.byType.map((x: any) => x.type)).toEqual(['Residency', 'Good Moral']);
    expect(t.byType[0].stats).toMatchObject({ count: 2, averageMs: 60 * MIN });
    expect(t.withinOneDayPct).toBe(100);
    expect(t.anomalies).toBe(0);
  });

  it('only measures RELEASED requests released inside the selected month', async () => {
    await GET(req('type=certificates&year=2026&month=10'));
    const call = (prisma.certificate.findMany as any).mock.calls
      .map((c: any[]) => c[0])
      .find((a: any) => a?.where?.status === 'RELEASED');

    expect(call).toBeDefined();
    expect(call.select).toEqual({ certificate_type: true, requested_at: true, issued_at: true });
    expect(call.where.issued_at.gte).toEqual(new Date(2026, 9, 1));
    expect(call.where.issued_at.lte.getMonth()).toBe(9); // October
  });

  it('leaves out rows released before they were requested and reports how many', async () => {
    mockFindMany([released('RESIDENCY', 60 * MIN), released('RESIDENCY', -10 * MIN)]);
    const t = (await (await GET(req())).json()).turnaround;
    expect(t.overall.count).toBe(1);
    expect(t.overall.averageMs).toBe(60 * MIN);
    expect(t.anomalies).toBe(1);
  });

  it('reports null stats (not zeros or NaN) when nothing was released in the period', async () => {
    const t = (await (await GET(req())).json()).turnaround;
    expect(t.overall).toEqual({ count: 0, averageMs: null, medianMs: null, minMs: null, maxMs: null, p90Ms: null });
    expect(t.withinOneDayPct).toBeNull();
    expect(t.byType).toEqual([]);
  });

  it('reports the current open backlog and how long the oldest request has waited', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T08:00:00Z'));
    (prisma.certificate.aggregate as any).mockResolvedValue({
      _count: 4,
      _min: { requested_at: new Date('2026-10-05T08:00:00Z') },
    });
    const t = (await (await GET(req())).json()).turnaround;
    expect(t.open).toEqual({ count: 4, oldestWaitMs: 24 * HOUR });

    const agg = (prisma.certificate.aggregate as any).mock.calls[0][0];
    expect(agg.where).toEqual({ status: { in: ['PENDING', 'PROCESSING'] } });
  });

  it('has no oldest-wait when nothing is open', async () => {
    const t = (await (await GET(req())).json()).turnaround;
    expect(t.open).toEqual({ count: 0, oldestWaitMs: null });
  });

  it('keeps the existing certificate-report fields intact', async () => {
    const body = await (await GET(req())).json();
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(['totalThisYear', 'totalThisMonth', 'byType', 'byMonth', 'recent', 'turnaround'])
    );
    expect(body.byMonth).toHaveLength(12);
  });

  it('still requires reports:read', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(prisma.certificate.findMany).not.toHaveBeenCalled();
  });
});