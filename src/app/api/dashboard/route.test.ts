// FILE: src/app/api/dashboard/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    resident: { count: vi.fn(), groupBy: vi.fn() },
    household: { count: vi.fn() },
    blotterCase: { count: vi.fn(), findMany: vi.fn() },
    equipmentBorrowing: { count: vi.fn() },
    equipment: { count: vi.fn() },
    certificate: { count: vi.fn(), groupBy: vi.fn() },
    visitorLog: { count: vi.fn() },
    meetingRecord: { count: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn(),
}));

import { requirePermission } from '@/lib/session';

function mockAuthAs(role: string) {
  (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role } } });
}

function makeReq() {
  return new NextRequest('http://localhost/api/dashboard');
}

function mockAllZero() {
  (prisma.resident.count as any).mockResolvedValue(0);
  (prisma.resident.groupBy as any).mockResolvedValue([]);
  (prisma.household.count as any).mockResolvedValue(0);
  (prisma.blotterCase.count as any).mockResolvedValue(0);
  (prisma.blotterCase.findMany as any).mockResolvedValue([]);
  (prisma.equipmentBorrowing.count as any).mockResolvedValue(0);
  (prisma.equipment.count as any).mockResolvedValue(0);
  (prisma.certificate.count as any).mockResolvedValue(0);
  (prisma.certificate.groupBy as any).mockResolvedValue([]);
  (prisma.visitorLog.count as any).mockResolvedValue(0);
  (prisma.meetingRecord.count as any).mockResolvedValue(0);
  (prisma.auditLog.findMany as any).mockResolvedValue([]);
}

describe('GET /api/dashboard — permission gating regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllZero();
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("BHW never queries audit logs, blotter, certificates, meetings, or equipment — the exact leak this route used to have", async () => {
    mockAuthAs('BHW');
    await GET(makeReq());

    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.blotterCase.count).not.toHaveBeenCalled();
    expect(prisma.blotterCase.findMany).not.toHaveBeenCalled();
    expect(prisma.certificate.count).not.toHaveBeenCalled();
    expect(prisma.certificate.groupBy).not.toHaveBeenCalled();
    expect(prisma.meetingRecord.count).not.toHaveBeenCalled();
    expect(prisma.equipment.count).not.toHaveBeenCalled();
    expect(prisma.equipmentBorrowing.count).not.toHaveBeenCalled();
  });

  it('BHW DOES query residents, households, and visitors (permissions it actually has)', async () => {
    mockAuthAs('BHW');
    await GET(makeReq());

    expect(prisma.resident.count).toHaveBeenCalled();
    expect(prisma.household.count).toHaveBeenCalled();
    expect(prisma.visitorLog.count).toHaveBeenCalled();
  });

  it('BHW response contains safe empty defaults for gated sections rather than omitting them', async () => {
    mockAuthAs('BHW');
    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.activeCases).toBe(0);
    expect(body.recentActivity).toEqual([]);
    expect(body.recentBlotterCases).toEqual([]);
    expect(body.documentsByStatus).toEqual([]);
    expect(body.trends.certsMonth).toBeNull();
    expect(body.trends.equipment).toBeNull();
  });

  it('ADMIN (wildcard) queries every gated data source', async () => {
    mockAuthAs('ADMIN');
    await GET(makeReq());

    expect(prisma.auditLog.findMany).toHaveBeenCalled();
    expect(prisma.blotterCase.count).toHaveBeenCalled();
    expect(prisma.certificate.count).toHaveBeenCalled();
    expect(prisma.meetingRecord.count).toHaveBeenCalled();
    expect(prisma.equipment.count).toHaveBeenCalled();
  });

  it('maps documentsByStatus groupBy rows from _count to a plain count field', async () => {
    mockAuthAs('ADMIN');
    (prisma.certificate.groupBy as any).mockResolvedValue([
      { status: 'PENDING', _count: 4 },
      { status: 'RELEASED', _count: 9 },
    ]);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.documentsByStatus).toEqual([
      { status: 'PENDING', count: 4 },
      { status: 'RELEASED', count: 9 },
    ]);
  });

  describe('trend % calculation', () => {
    it('returns null (shown as "New") when there was no baseline last month but there is activity this month', async () => {
      mockAuthAs('ADMIN');
      (prisma.resident.count as any)
        .mockResolvedValueOnce(0) // total residents (unrelated to trend)
        .mockResolvedValue(5); // subsequent calls: residentsThisMonth=5, residentsLastMonth handled below

      // Simpler: directly control the two month-comparison calls via call order.
      // resident.count call order in the route: [0]=totalResidents, then later
      // [1]=residentsThisMonth, [2]=residentsLastMonth.
      (prisma.resident.count as any).mockReset();
      (prisma.resident.count as any)
        .mockResolvedValueOnce(50) // totalResidents
        .mockResolvedValueOnce(5) // residentsThisMonth
        .mockResolvedValueOnce(0); // residentsLastMonth

      const res = await GET(makeReq());
      const body = await res.json();
      expect(body.trends.residents).toBeNull();
    });

    it('returns 0 when both this month and last month are 0 (no change, not "New")', async () => {
      mockAuthAs('ADMIN');
      (prisma.resident.count as any)
        .mockResolvedValueOnce(50) // totalResidents
        .mockResolvedValueOnce(0) // residentsThisMonth
        .mockResolvedValueOnce(0); // residentsLastMonth

      const res = await GET(makeReq());
      const body = await res.json();
      expect(body.trends.residents).toBe(0);
    });

    it('computes a real percentage rounded to 1 decimal when there is a nonzero baseline', async () => {
      mockAuthAs('ADMIN');
      (prisma.resident.count as any)
        .mockResolvedValueOnce(50) // totalResidents
        .mockResolvedValueOnce(15) // residentsThisMonth
        .mockResolvedValueOnce(10); // residentsLastMonth (50% increase)

      const res = await GET(makeReq());
      const body = await res.json();
      expect(body.trends.residents).toBe(50);
    });
  });
});