// FILE: src/app/api/health/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { healthRecord: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/health', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by resident_id and search term together', async () => {
    (prisma.healthRecord.findMany as any).mockResolvedValue([]);
    (prisma.healthRecord.count as any).mockResolvedValue(0);

    await GET(new NextRequest('http://localhost/api/health?resident_id=7&search=checkup'));
    const where = (prisma.healthRecord.findMany as any).mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({ resident_id: 7 });
    expect(JSON.stringify(where.AND[1])).toContain('checkup');
  });

  it('orders results by most recently recorded', async () => {
    (prisma.healthRecord.findMany as any).mockResolvedValue([]);
    (prisma.healthRecord.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/health'));
    expect((prisma.healthRecord.findMany as any).mock.calls[0][0].orderBy).toEqual({ recorded_at: 'desc' });
  });
});

describe('POST /api/health', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps recorded_by with the logged-in user id', async () => {
    (prisma.healthRecord.create as any).mockResolvedValue({ id: 1, resident_id: 5 });

    await POST(makeReq({ resident_id: 5, record_type: 'Checkup' }));

    const createArgs = (prisma.healthRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.recorded_by).toBe(1);
  });

  it('logs an audit entry', async () => {
    (prisma.healthRecord.create as any).mockResolvedValue({ id: 2, resident_id: 5 });
    await POST(makeReq({ resident_id: 5, record_type: 'Vaccination' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'HealthRecord', record_id: 2 })
    );
  });

  it('rejects a request missing record_type (schema validation)', async () => {
    const res = await POST(makeReq({ resident_id: 5 }));
    expect(res.status).toBe(400);
    expect(prisma.healthRecord.create).not.toHaveBeenCalled();
  });
});