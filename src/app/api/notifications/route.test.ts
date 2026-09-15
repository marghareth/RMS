// FILE: src/app/api/notifications/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    equipmentBorrowing: { findMany: vi.fn() },
    blotterCase: { findMany: vi.fn() },
    certificate: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn(),
}));

import { requirePermission } from '@/lib/session';

function mockAuthAs(role: string) {
  (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role } } });
}

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.equipmentBorrowing.findMany as any).mockResolvedValue([]);
    (prisma.blotterCase.findMany as any).mockResolvedValue([]);
    (prisma.certificate.findMany as any).mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    expect(res.status).toBe(401);
  });

  it('returns an empty notification list when nothing is overdue/upcoming', async () => {
    mockAuthAs('ADMIN');
    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body.notifications).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('surfaces an overdue equipment borrowing as urgent', async () => {
    mockAuthAs('ADMIN');
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    (prisma.equipmentBorrowing.findMany as any).mockResolvedValue([
      { id: 1, expected_return: twoDaysAgo, borrower_name: 'Juan', equipment: { name: 'Projector' } },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.notifications[0]).toMatchObject({ id: 'equipment-1', severity: 'urgent' });
    expect(body.notifications[0].message).toContain('Projector');
    expect(body.notifications[0].message).toContain('2 days overdue');
  });

  it('does NOT query equipment data for a role without equipment:read (e.g. BHW)', async () => {
    mockAuthAs('BHW');
    await GET(new NextRequest('http://localhost/api/notifications'));
    expect(prisma.equipmentBorrowing.findMany).not.toHaveBeenCalled();
  });

  it('does NOT query blotter/certificate data for a role without those permissions (BHW)', async () => {
    mockAuthAs('BHW');
    await GET(new NextRequest('http://localhost/api/notifications'));
    expect(prisma.blotterCase.findMany).not.toHaveBeenCalled();
    expect(prisma.certificate.findMany).not.toHaveBeenCalled();
  });

  it('surfaces an overdue hearing as urgent and an upcoming one as warning', async () => {
    mockAuthAs('ADMIN');
    const yesterday = new Date(Date.now() - 86400000);
    const tomorrow = new Date(Date.now() + 86400000);
    (prisma.blotterCase.findMany as any)
      .mockResolvedValueOnce([{ id: 1, case_number: 'BLT-2026-0001', status: 'ONGOING', hearing_date: yesterday }])
      .mockResolvedValueOnce([{ id: 2, case_number: 'BLT-2026-0002', status: 'FILED', hearing_date: tomorrow }]);

    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    const overdue = body.notifications.find((n: any) => n.id === 'hearing-overdue-1');
    const upcoming = body.notifications.find((n: any) => n.id === 'hearing-upcoming-2');
    expect(overdue.severity).toBe('urgent');
    expect(upcoming.severity).toBe('warning');
  });

  it('surfaces a certificate pending more than 48 hours as a warning', async () => {
    mockAuthAs('ADMIN');
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    (prisma.certificate.findMany as any).mockResolvedValue([
      { id: 1, queue_number: 'Q-2026-0001', certificate_no: 'CERT-2026-000001', requested_at: threeDaysAgo },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body.notifications[0]).toMatchObject({ id: 'certificate-pending-1', severity: 'warning' });
    expect(body.notifications[0].message).toContain('day(s)');
  });

  it('sorts urgent notifications before warning notifications regardless of date', async () => {
    mockAuthAs('ADMIN');
    const now = new Date();
    const longAgo = new Date(now.getTime() - 10 * 86400000);
    const soon = new Date(now.getTime() + 86400000);

    // Warning (upcoming hearing) has an earlier "date" than the urgent
    // (overdue equipment) one — severity should still win the sort.
    (prisma.equipmentBorrowing.findMany as any).mockResolvedValue([
      { id: 1, expected_return: longAgo, borrower_name: 'Juan', equipment: { name: 'Laptop' } },
    ]);
    (prisma.blotterCase.findMany as any)
      .mockResolvedValueOnce([]) // overdue hearings
      .mockResolvedValueOnce([{ id: 2, case_number: 'BLT-2026-0002', status: 'FILED', hearing_date: soon }]);

    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(body.notifications[0].severity).toBe('urgent');
    expect(body.notifications[1].severity).toBe('warning');
  });
});