// FILE: src/app/api/equipment/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { equipment: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/equipment/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/equipment/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.equipment.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/equipment/99'), makeContext('99'));
    expect(res.status).toBe(404);
  });

  it('includes borrowing history ordered most-recent-first', async () => {
    (prisma.equipment.findUnique as any).mockResolvedValue({ id: 1, name: 'Projector', borrowings: [] });
    await GET(new NextRequest('http://localhost/api/equipment/1'), makeContext('1'));
    const includeArg = (prisma.equipment.findUnique as any).mock.calls[0][0].include;
    expect(includeArg.borrowings.orderBy).toEqual({ date_borrowed: 'desc' });
  });
});

describe('PATCH /api/equipment/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does NOT reset quantity to 1 when a PATCH omits it (regression test)', async () => {
    // Before the schema fix, renaming an item alone used to silently
    // write quantity: 1 into the database because
    // equipmentUpdateSchema.partial() didn't clear .default(1). See
    // validations.ts for the fix.
    (prisma.equipment.update as any).mockResolvedValue({ id: 1, name: 'Projector (renamed)' });

    await PATCH(makeReq({ name: 'Projector (renamed)' }), makeContext('1'));

    const updateArgs = (prisma.equipment.update as any).mock.calls[0][0];
    expect(updateArgs.data.quantity).toBeUndefined();
  });

  it('does update quantity when explicitly provided', async () => {
    (prisma.equipment.update as any).mockResolvedValue({ id: 1, name: 'Projector', quantity: 3 });
    await PATCH(makeReq({ quantity: 3 }), makeContext('1'));
    const updateArgs = (prisma.equipment.update as any).mock.calls[0][0];
    expect(updateArgs.data.quantity).toBe(3);
  });

  it('rejects a quantity of 0 or less (schema validation)', async () => {
    const res = await PATCH(makeReq({ quantity: 0 }), makeContext('1'));
    expect(res.status).toBe(400);
    expect(prisma.equipment.update).not.toHaveBeenCalled();
  });

  it('clears a nullable field (e.g. condition) to null when explicitly set to null, but leaves it untouched when omitted', async () => {
    (prisma.equipment.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ condition: null }), makeContext('1'));
    let updateArgs = (prisma.equipment.update as any).mock.calls[0][0];
    expect(updateArgs.data.condition).toBeNull();

    vi.clearAllMocks();
    (prisma.equipment.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ name: 'Renamed only' }), makeContext('1'));
    updateArgs = (prisma.equipment.update as any).mock.calls[0][0];
    expect(updateArgs.data.condition).toBeUndefined();
  });

  it('logs an audit entry', async () => {
    (prisma.equipment.update as any).mockResolvedValue({ id: 1, name: 'Projector' });
    await PATCH(makeReq({ name: 'Projector' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'Equipment', record_id: 1 })
    );
  });
});