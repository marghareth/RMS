// FILE: src/app/api/meetings/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    meetingRecord: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    agendaItem: { count: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/meetings/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/meetings/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.meetingRecord.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/meetings/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('includes agenda items ordered by sort_order', async () => {
    (prisma.meetingRecord.findUnique as any).mockResolvedValue({ id: 1, agenda_items: [] });
    await GET(new NextRequest('http://localhost/api/meetings/1'), makeContext('1'));
    const include = (prisma.meetingRecord.findUnique as any).mock.calls[0][0].include;
    expect(include.agenda_items.orderBy).toEqual({ sort_order: 'asc' });
  });
});

describe('PATCH /api/meetings/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears a nullable field (title) to null when explicitly set, leaves it alone when omitted', async () => {
    (prisma.meetingRecord.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ title: null }), makeContext('1'));
    let updateArgs = (prisma.meetingRecord.update as any).mock.calls[0][0];
    expect(updateArgs.data.title).toBeNull();

    vi.clearAllMocks();
    (prisma.meetingRecord.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ status: 'COMPLETED' }), makeContext('1'));
    updateArgs = (prisma.meetingRecord.update as any).mock.calls[0][0];
    expect(updateArgs.data.title).toBeUndefined();
    expect(updateArgs.data.status).toBe('COMPLETED');
  });

  it('logs an audit entry', async () => {
    (prisma.meetingRecord.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ status: 'CANCELLED' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'MeetingRecord', record_id: 1 })
    );
  });
});

describe('DELETE /api/meetings/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the meeting and mentions the cascade-deleted agenda item count in the audit log', async () => {
    (prisma.agendaItem.count as any).mockResolvedValue(3);
    (prisma.meetingRecord.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/meetings/1'), makeContext('1'));
    expect(res.status).toBe(200);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        table_affected: 'MeetingRecord',
        record_id: 1,
        details: expect.stringContaining('3 agenda item(s)'),
      })
    );
  });
});