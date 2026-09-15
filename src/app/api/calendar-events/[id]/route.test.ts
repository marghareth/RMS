// FILE: src/app/api/calendar-events/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { calendarEvent: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/calendar-events/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/calendar-events/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.calendarEvent.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/calendar-events/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/calendar-events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.calendarEvent.findUnique as any).mockResolvedValue({ id: 1, title: 'Existing event' });
  });

  it('404s when the event does not exist', async () => {
    (prisma.calendarEvent.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ title: 'x' }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('unlinks a meeting when meeting_id is explicitly set to null, leaves it alone when omitted', async () => {
    (prisma.calendarEvent.update as any).mockResolvedValue({ id: 1, title: 'Event' });
    await PATCH(makeReq({ meeting_id: null }), makeContext('1'));
    let updateArgs = (prisma.calendarEvent.update as any).mock.calls[0][0];
    expect(updateArgs.data.meeting_id).toBeNull();

    vi.clearAllMocks();
    (prisma.calendarEvent.findUnique as any).mockResolvedValue({ id: 1, title: 'Existing event' });
    (prisma.calendarEvent.update as any).mockResolvedValue({ id: 1, title: 'Renamed' });
    await PATCH(makeReq({ title: 'Renamed' }), makeContext('1'));
    updateArgs = (prisma.calendarEvent.update as any).mock.calls[0][0];
    expect(updateArgs.data.meeting_id).toBeUndefined();
  });

  it('logs an audit entry', async () => {
    (prisma.calendarEvent.update as any).mockResolvedValue({ id: 1, title: 'Event' });
    await PATCH(makeReq({ title: 'Event' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'CalendarEvent', record_id: 1 })
    );
  });
});

describe('DELETE /api/calendar-events/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the event does not exist', async () => {
    (prisma.calendarEvent.findUnique as any).mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/calendar-events/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('deletes and logs an audit entry naming the event', async () => {
    (prisma.calendarEvent.findUnique as any).mockResolvedValue({ id: 1, title: 'Flag ceremony' });
    (prisma.calendarEvent.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/calendar-events/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        table_affected: 'CalendarEvent',
        record_id: 1,
        details: expect.stringContaining('Flag ceremony'),
      })
    );
  });
});