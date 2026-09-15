// FILE: src/app/api/meetings/[id]/duplicate/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { meetingRecord: { findUnique: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/meetings/1/duplicate', { method: 'POST', body: JSON.stringify(body) });
}

const sourceMeeting = {
  id: 1,
  meeting_type: 'SB_MEETING',
  title: 'Weekly Session',
  location: 'Barangay Hall',
  minutes: 'Last week we discussed the budget in detail.',
  agenda_items: [
    { title: 'Budget review', description: 'Q1 numbers', sort_order: 1 },
    { title: 'New business', description: null, sort_order: 2 },
  ],
};

describe('POST /api/meetings/[id]/duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.meetingRecord.findUnique as any).mockResolvedValue(sourceMeeting);
  });

  it('404s when the source meeting does not exist', async () => {
    (prisma.meetingRecord.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ meeting_date: '2026-06-08' }), makeContext('999'));
    expect(res.status).toBe(404);
    expect(prisma.meetingRecord.create).not.toHaveBeenCalled();
  });

  it('carries over type/title/location and always sets status to SCHEDULED', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ meeting_date: '2026-06-08' }), makeContext('1'));

    const createArgs = (prisma.meetingRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.meeting_type).toBe('SB_MEETING');
    expect(createArgs.data.title).toBe('Weekly Session');
    expect(createArgs.data.location).toBe('Barangay Hall');
    expect(createArgs.data.status).toBe('SCHEDULED');
  });

  it('deliberately does NOT carry over minutes', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ meeting_date: '2026-06-08' }), makeContext('1'));
    const createArgs = (prisma.meetingRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.minutes).toBeNull();
  });

  it('clones every agenda item, resetting status to PENDING and minutes to null', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ meeting_date: '2026-06-08' }), makeContext('1'));

    const createArgs = (prisma.meetingRecord.create as any).mock.calls[0][0];
    const clonedItems = createArgs.data.agenda_items.create;
    expect(clonedItems).toHaveLength(2);
    expect(clonedItems[0]).toEqual({
      title: 'Budget review',
      description: 'Q1 numbers',
      sort_order: 1,
      status: 'PENDING',
      minutes: null,
    });
    expect(clonedItems[1].status).toBe('PENDING');
    expect(clonedItems[1].minutes).toBeNull();
  });

  it('logs an audit entry naming the source meeting and the number of agenda items carried over', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ meeting_date: '2026-06-08' }), makeContext('1'));

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        table_affected: 'MeetingRecord',
        record_id: 2,
        details: expect.stringContaining('2 agenda item(s)'),
      })
    );
  });

  it('rejects a request missing meeting_date (schema validation)', async () => {
    const res = await POST(makeReq({}), makeContext('1'));
    expect(res.status).toBe(400);
    expect(prisma.meetingRecord.findUnique).not.toHaveBeenCalled();
  });
});