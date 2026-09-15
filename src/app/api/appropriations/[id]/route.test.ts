// FILE: src/app/api/appropriations/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    appropriation: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    disbursement: { count: vi.fn() },
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
  return new NextRequest('http://localhost/api/appropriations/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/appropriations/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.appropriation.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/appropriations/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/appropriations/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('strips disbursed_amount from the update payload so it cannot be edited directly', async () => {
    (prisma.appropriation.update as any).mockResolvedValue({ id: 1, item_name: 'Office Supplies' });

    await PATCH(makeReq({ item_name: 'Office Supplies (Renamed)', disbursed_amount: 999999 }), makeContext('1'));

    const updateArgs = (prisma.appropriation.update as any).mock.calls[0][0];
    expect(updateArgs.data).not.toHaveProperty('disbursed_amount');
    expect(updateArgs.data.item_name).toBe('Office Supplies (Renamed)');
  });

  it('does NOT zero out appropriated_amount/obligated_amount when a PATCH omits them (regression test)', async () => {
    // This is the exact scenario that used to corrupt real budget data:
    // editing just the item_name used to silently write
    // appropriated_amount: 0 / obligated_amount: 0 into the database
    // because appropriationUpdateSchema.partial() didn't clear the
    // .default(0) on those fields. See validations.ts for the fix.
    (prisma.appropriation.update as any).mockResolvedValue({ id: 1, item_name: 'Renamed only' });

    await PATCH(makeReq({ item_name: 'Renamed only' }), makeContext('1'));

    const updateArgs = (prisma.appropriation.update as any).mock.calls[0][0];
    expect(updateArgs.data).not.toHaveProperty('appropriated_amount');
    expect(updateArgs.data).not.toHaveProperty('obligated_amount');
  });

  it('does update appropriated_amount/obligated_amount when explicitly provided', async () => {
    (prisma.appropriation.update as any).mockResolvedValue({ id: 1, item_name: 'Office Supplies' });

    await PATCH(makeReq({ appropriated_amount: 10000, obligated_amount: 2000 }), makeContext('1'));

    const updateArgs = (prisma.appropriation.update as any).mock.calls[0][0];
    expect(updateArgs.data.appropriated_amount).toBe(10000);
    expect(updateArgs.data.obligated_amount).toBe(2000);
  });

  it('logs an audit entry', async () => {
    (prisma.appropriation.update as any).mockResolvedValue({ id: 1, item_name: 'Office Supplies' });
    await PATCH(makeReq({ item_name: 'Office Supplies' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', table_affected: 'Appropriation' }));
  });
});

describe('DELETE /api/appropriations/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks deletion when disbursements are recorded against it', async () => {
    (prisma.disbursement.count as any).mockResolvedValue(3);
    const res = await DELETE(new NextRequest('http://localhost/api/appropriations/1'), makeContext('1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('HAS_DEPENDENTS');
    expect(body.message).toContain('3 disbursement(s)');
    expect(prisma.appropriation.delete).not.toHaveBeenCalled();
  });

  it('allows deletion when there are no disbursements', async () => {
    (prisma.disbursement.count as any).mockResolvedValue(0);
    (prisma.appropriation.delete as any).mockResolvedValue({ id: 1, item_name: 'Unused line item' });

    const res = await DELETE(new NextRequest('http://localhost/api/appropriations/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', table_affected: 'Appropriation' }));
  });
});