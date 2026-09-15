// FILE: src/app/api/meetings/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { meetingRecord: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/meetings', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/meetings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('combines meeting_type, status, location, title, and date range filters', async () => {
    (prisma.meetingRecord.findMany as any).mockResolvedValue([]);
    (prisma.meetingRecord.count as any).mockResolvedValue(0);

    await GET(
      new NextRequest(
        'http://localhost/api/meetings?meeting_type=SB_MEETING&status=SCHEDULED&location=Hall&title=Budget&date_from=2026-01-01&date_to=2026-12-31'
      )
    );

    const where = (prisma.meetingRecord.findMany as any).mock.calls[0][0].where;
    const serialized = JSON.stringify(where);
    expect(serialized).toContain('SB_MEETING');
    expect(serialized).toContain('SCHEDULED');
    expect(serialized).toContain('Hall');
    expect(serialized).toContain('Budget');
  });

  it('includes agenda item counts', async () => {
    (prisma.meetingRecord.findMany as any).mockResolvedValue([]);
    (prisma.meetingRecord.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/meetings'));
    const include = (prisma.meetingRecord.findMany as any).mock.calls[0][0].include;
    expect(include._count.select.agenda_items).toBe(true);
  });
});

describe('POST /api/meetings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults status to SCHEDULED when omitted', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 1, meeting_type: 'SB_MEETING' });
    await POST(makeReq({ meeting_type: 'SB_MEETING', meeting_date: '2026-06-01' }));
    const createArgs = (prisma.meetingRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.status).toBe('SCHEDULED');
  });

  it('stamps recorded_by with the logged-in user', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 1 });
    await POST(makeReq({ meeting_type: 'BARANGAY_ASSEMBLY', meeting_date: '2026-06-01' }));
    const createArgs = (prisma.meetingRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.recorded_by).toBe(1);
  });

  it('logs an audit entry', async () => {
    (prisma.meetingRecord.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ meeting_type: 'SB_MEETING', meeting_date: '2026-06-01', title: 'Q2 Budget Review' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'MeetingRecord', record_id: 2 })
    );
  });

  it('rejects an invalid meeting_type (schema validation)', async () => {
    const res = await POST(makeReq({ meeting_type: 'TOWN_HALL', meeting_date: '2026-06-01' }));
    expect(res.status).toBe(400);
    expect(prisma.meetingRecord.create).not.toHaveBeenCalled();
  });
});