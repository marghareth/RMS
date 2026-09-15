// FILE: src/app/api/visitor-logs/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { visitorLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/visitor-logs', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/visitor-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters to only still-on-premises visitors when status=active', async () => {
    (prisma.visitorLog.findMany as any).mockResolvedValue([]);
    (prisma.visitorLog.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/visitor-logs?status=active'));
    const where = (prisma.visitorLog.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ time_out: null });
  });

  it('filters to only checked-out visitors when status=checked_out', async () => {
    (prisma.visitorLog.findMany as any).mockResolvedValue([]);
    (prisma.visitorLog.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/visitor-logs?status=checked_out'));
    const where = (prisma.visitorLog.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ time_out: { not: null } });
  });

  it('searches across visitor_name, purpose, and person_to_visit', async () => {
    (prisma.visitorLog.findMany as any).mockResolvedValue([]);
    (prisma.visitorLog.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/visitor-logs?search=Juan'));
    const where = (prisma.visitorLog.findMany as any).mock.calls[0][0].where;
    const orClause = where.AND.find((c: any) => c.OR);
    expect(orClause.OR).toHaveLength(3);
  });
});

describe('POST /api/visitor-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps recorded_by with the logged-in user', async () => {
    (prisma.visitorLog.create as any).mockResolvedValue({ id: 1, visitor_name: 'Juan Dela Cruz' });
    await POST(makeReq({ visitor_name: 'Juan Dela Cruz', purpose: 'Document request' }));
    const createArgs = (prisma.visitorLog.create as any).mock.calls[0][0];
    expect(createArgs.data.recorded_by).toBe(1);
  });

  it('logs an audit entry', async () => {
    (prisma.visitorLog.create as any).mockResolvedValue({ id: 2, visitor_name: 'Maria Santos' });
    await POST(makeReq({ visitor_name: 'Maria Santos', purpose: 'Meeting' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'VisitorLog', record_id: 2 })
    );
  });

  it('rejects a request missing purpose (schema validation)', async () => {
    const res = await POST(makeReq({ visitor_name: 'Juan Dela Cruz' }));
    expect(res.status).toBe(400);
    expect(prisma.visitorLog.create).not.toHaveBeenCalled();
  });
});