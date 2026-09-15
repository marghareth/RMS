// FILE: src/app/api/audit-logs/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: { auditLog: { findMany: vi.fn(), count: vi.fn() } },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

describe('GET /api/audit-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.auditLog.findMany as any).mockResolvedValue([]);
    (prisma.auditLog.count as any).mockResolvedValue(0);
  });

  it('defaults limit to 50 (not the usual 20) when omitted', async () => {
    const res = await GET(new NextRequest('http://localhost/api/audit-logs'));
    const body = await res.json();
    expect(body.limit).toBe(50);
    expect((prisma.auditLog.findMany as any).mock.calls[0][0].take).toBe(50);
  });

  it('still respects an explicit limit override', async () => {
    const res = await GET(new NextRequest('http://localhost/api/audit-logs?limit=10'));
    const body = await res.json();
    expect(body.limit).toBe(10);
  });

  it('combines user_id, table_affected, and date range filters', async () => {
    await GET(
      new NextRequest('http://localhost/api/audit-logs?user_id=7&table_affected=Resident&date_from=2026-01-01&date_to=2026-12-31')
    );
    const where = (prisma.auditLog.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ user_id: 7 });
    expect(where.AND).toContainEqual({ table_affected: 'Resident' });
  });

  it('orders by most recent action first', async () => {
    await GET(new NextRequest('http://localhost/api/audit-logs'));
    expect((prisma.auditLog.findMany as any).mock.calls[0][0].orderBy).toEqual({ performed_at: 'desc' });
  });
});