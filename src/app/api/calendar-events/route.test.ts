// FILE: src/app/api/calendar-events/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { calendarEvent: { findMany: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/calendar-events', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/calendar-events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies both date_from and date_to bounds together', async () => {
    (prisma.calendarEvent.findMany as any).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/calendar-events?date_from=2026-01-01&date_to=2026-01-31'));
    const where = (prisma.calendarEvent.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ event_date: { gte: new Date('2026-01-01') } });
    expect(where.AND).toContainEqual({ event_date: { lte: new Date('2026-01-31') } });
  });

  it('returns everything (unbounded) when no date range is given', async () => {
    (prisma.calendarEvent.findMany as any).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/calendar-events'));
    const where = (prisma.calendarEvent.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toEqual([{}, {}]);
  });
});

describe('POST /api/calendar-events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps created_by with the logged-in user', async () => {
    (prisma.calendarEvent.create as any).mockResolvedValue({ id: 1, title: 'Flag ceremony' });
    await POST(makeReq({ title: 'Flag ceremony', event_date: '2026-06-01' }));
    const createArgs = (prisma.calendarEvent.create as any).mock.calls[0][0];
    expect(createArgs.data.created_by).toBe(1);
  });

  it('optionally links the event to a meeting', async () => {
    (prisma.calendarEvent.create as any).mockResolvedValue({ id: 2, title: 'SB Session' });
    await POST(makeReq({ title: 'SB Session', event_date: '2026-06-01', meeting_id: 7 }));
    const createArgs = (prisma.calendarEvent.create as any).mock.calls[0][0];
    expect(createArgs.data.meeting_id).toBe(7);
  });

  it('logs an audit entry', async () => {
    (prisma.calendarEvent.create as any).mockResolvedValue({ id: 3, title: 'Cleanup drive' });
    await POST(makeReq({ title: 'Cleanup drive', event_date: '2026-06-01' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'CalendarEvent', record_id: 3 })
    );
  });

  it('rejects a request missing event_date (schema validation)', async () => {
    const res = await POST(makeReq({ title: 'No date event' }));
    expect(res.status).toBe(400);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });
});