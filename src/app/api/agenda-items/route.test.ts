// FILE: src/app/api/agenda-items/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    agendaItem: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    meetingRecord: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/agenda-items', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/agenda-items', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a meeting_id query param', async () => {
    const res = await GET(new NextRequest('http://localhost/api/agenda-items'));
    expect(res.status).toBe(400);
    expect(prisma.agendaItem.findMany).not.toHaveBeenCalled();
  });

  it('lists agenda items for a meeting ordered by sort_order', async () => {
    (prisma.agendaItem.findMany as any).mockResolvedValue([{ id: 1, title: 'Budget review' }]);
    await GET(new NextRequest('http://localhost/api/agenda-items?meeting_id=5'));
    const call = (prisma.agendaItem.findMany as any).mock.calls[0][0];
    expect(call.where).toEqual({ meeting_id: 5 });
    expect(call.orderBy).toEqual({ sort_order: 'asc' });
  });
});

describe('POST /api/agenda-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.meetingRecord.findUnique as any).mockResolvedValue({ id: 5 });
  });

  it('404s when the parent meeting does not exist', async () => {
    (prisma.meetingRecord.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ meeting_id: 999, title: 'Item' }));
    expect(res.status).toBe(404);
  });

  it('auto-assigns sort_order as last+1 when not explicitly provided', async () => {
    (prisma.agendaItem.findFirst as any).mockResolvedValue({ sort_order: 4 });
    (prisma.agendaItem.create as any).mockResolvedValue({ id: 1, title: 'New item', sort_order: 5 });

    await POST(makeReq({ meeting_id: 5, title: 'New item' }));

    const createArgs = (prisma.agendaItem.create as any).mock.calls[0][0];
    expect(createArgs.data.sort_order).toBe(5);
  });

  it('starts sort_order at 1 for the first item in a meeting', async () => {
    (prisma.agendaItem.findFirst as any).mockResolvedValue(null);
    (prisma.agendaItem.create as any).mockResolvedValue({ id: 1, title: 'First item', sort_order: 1 });

    await POST(makeReq({ meeting_id: 5, title: 'First item' }));

    const createArgs = (prisma.agendaItem.create as any).mock.calls[0][0];
    expect(createArgs.data.sort_order).toBe(1);
  });

  it('respects an explicitly provided sort_order instead of auto-assigning', async () => {
    (prisma.agendaItem.create as any).mockResolvedValue({ id: 1, title: 'Priority item', sort_order: 1 });

    await POST(makeReq({ meeting_id: 5, title: 'Priority item', sort_order: 1 }));

    expect(prisma.agendaItem.findFirst).not.toHaveBeenCalled();
    const createArgs = (prisma.agendaItem.create as any).mock.calls[0][0];
    expect(createArgs.data.sort_order).toBe(1);
  });

  it('logs an audit entry', async () => {
    (prisma.agendaItem.findFirst as any).mockResolvedValue(null);
    (prisma.agendaItem.create as any).mockResolvedValue({ id: 7, title: 'Item' });
    await POST(makeReq({ meeting_id: 5, title: 'Item' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'AgendaItem', record_id: 7 })
    );
  });

  it('rejects a request missing title (schema validation)', async () => {
    const res = await POST(makeReq({ meeting_id: 5 }));
    expect(res.status).toBe(400);
    expect(prisma.meetingRecord.findUnique).not.toHaveBeenCalled();
  });
});