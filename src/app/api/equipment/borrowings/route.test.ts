// FILE: src/app/api/equipment/borrowings/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    equipmentBorrowing: { updateMany: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/equipment/borrowings', {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/equipment/borrowings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.equipmentBorrowing.updateMany as any).mockResolvedValue({ count: 0 });
    (prisma.equipmentBorrowing.findMany as any).mockResolvedValue([]);
  });

  it('auto-flags overdue borrowings before returning results, every call', async () => {
    await GET(makeReq('GET'));
    expect(prisma.equipmentBorrowing.updateMany).toHaveBeenCalledWith({
      where: { actual_return: null, expected_return: { lt: expect.any(Date) }, is_overdue: false },
      data: { is_overdue: true },
    });
  });

  it('filters to only outstanding (not-yet-returned) borrowings when is_returned=false', async () => {
    await GET(new NextRequest('http://localhost/api/equipment/borrowings?is_returned=false'));
    expect((prisma.equipmentBorrowing.findMany as any).mock.calls[0][0].where).toEqual({ actual_return: null });
  });

  it('returns everything when is_returned is omitted', async () => {
    await GET(makeReq('GET'));
    expect((prisma.equipmentBorrowing.findMany as any).mock.calls[0][0].where).toEqual({});
  });
});

describe('POST /api/equipment/borrowings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a borrowing record stamped with the recording user', async () => {
    (prisma.equipmentBorrowing.create as any).mockResolvedValue({
      id: 1, equipment: { name: 'Projector' }, resident: null,
    });

    const res = await POST(
      makeReq('POST', {
        equipment_id: 1,
        borrower_name: 'Juan Dela Cruz',
        date_borrowed: '2026-01-01',
        expected_return: '2026-01-08',
      })
    );

    expect(res.status).toBe(201);
    const createArgs = (prisma.equipmentBorrowing.create as any).mock.calls[0][0];
    expect(createArgs.data.recorded_by).toBe(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'EquipmentBorrowing', record_id: 1 })
    );
  });
});

describe('PATCH /api/equipment/borrowings (mark returned)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets actual_return to now and clears is_overdue', async () => {
    (prisma.equipmentBorrowing.update as any).mockResolvedValue({ id: 1, equipment: { name: 'Projector' } });

    const res = await PATCH(makeReq('PATCH', { id: 1, return_condition: 'Good' }));
    expect(res.status).toBe(200);

    const updateArgs = (prisma.equipmentBorrowing.update as any).mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.actual_return).toBeInstanceOf(Date);
    expect(updateArgs.data.is_overdue).toBe(false);
    expect(updateArgs.data.return_condition).toBe('Good');
  });

  it('logs an audit entry', async () => {
    (prisma.equipmentBorrowing.update as any).mockResolvedValue({ id: 1, equipment: { name: 'Projector' } });
    await PATCH(makeReq('PATCH', { id: 1 }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'EquipmentBorrowing', record_id: 1 })
    );
  });

  it('rejects a request with a non-positive id (schema validation)', async () => {
    const res = await PATCH(makeReq('PATCH', { id: -1 }));
    expect(res.status).toBe(400);
    expect(prisma.equipmentBorrowing.update).not.toHaveBeenCalled();
  });
});