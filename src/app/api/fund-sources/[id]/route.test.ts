// FILE: src/app/api/fund-sources/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    fundSource: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    revenue: { findMany: vi.fn(), count: vi.fn() },
    disbursement: { findMany: vi.fn(), count: vi.fn() },
    appropriation: { count: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

describe('GET /api/fund-sources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('404s when the fund source does not exist', async () => {
    (prisma.fundSource.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/fund-sources/99'), makeContext('99'));
    expect(res.status).toBe(404);
  });

  it('merges revenues and disbursements into one chronological transaction ledger', async () => {
    (prisma.fundSource.findUnique as any).mockResolvedValue({ id: 1, name: 'General Fund', current_balance: 1000 });
    (prisma.revenue.findMany as any).mockResolvedValue([
      { id: 1, date: new Date('2026-01-05'), amount: 500, source: 'Real Property Tax', or_number: 'OR-1' },
    ]);
    (prisma.disbursement.findMany as any).mockResolvedValue([
      { id: 2, date: new Date('2026-01-10'), amount: 200, payee: 'ABC Supplies', or_number: 'OR-2' },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/fund-sources/1'), makeContext('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions).toHaveLength(2);
    // Most recent (disbursement on 01-10) should come first.
    expect(body.transactions[0].id).toBe('disbursement-2');
    expect(body.transactions[0].type).toBe('DISBURSEMENT');
    expect(body.transactions[1].id).toBe('revenue-1');
    expect(body.transactions[1].type).toBe('REVENUE');
  });
});

describe('PATCH /api/fund-sources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('strips current_balance from the update payload so it cannot be edited directly', async () => {
    (prisma.fundSource.update as any).mockResolvedValue({ id: 1, name: 'General Fund' });

    const req = new NextRequest('http://localhost/api/fund-sources/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'General Fund (Renamed)', current_balance: 999999 }),
    });
    await PATCH(req, makeContext('1'));

    const updateArgs = (prisma.fundSource.update as any).mock.calls[0][0];
    expect(updateArgs.data).not.toHaveProperty('current_balance');
    expect(updateArgs.data.name).toBe('General Fund (Renamed)');
  });

  it('logs an audit entry', async () => {
    (prisma.fundSource.update as any).mockResolvedValue({ id: 1, name: 'General Fund' });
    const req = new NextRequest('http://localhost/api/fund-sources/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'General Fund' }),
    });
    await PATCH(req, makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', table_affected: 'FundSource' }));
  });
});

describe('DELETE /api/fund-sources/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('blocks deletion when there are linked appropriations/revenues/disbursements', async () => {
    (prisma.appropriation.count as any).mockResolvedValue(2);
    (prisma.revenue.count as any).mockResolvedValue(1);
    (prisma.disbursement.count as any).mockResolvedValue(0);

    const res = await DELETE(new NextRequest('http://localhost/api/fund-sources/1'), makeContext('1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('HAS_DEPENDENTS');
    expect(body.message).toContain('3 record(s)');
    expect(prisma.fundSource.delete).not.toHaveBeenCalled();
  });

  it('allows deletion and logs an audit entry when there are no linked records', async () => {
    (prisma.appropriation.count as any).mockResolvedValue(0);
    (prisma.revenue.count as any).mockResolvedValue(0);
    (prisma.disbursement.count as any).mockResolvedValue(0);
    (prisma.fundSource.delete as any).mockResolvedValue({ id: 1, name: 'Unused Fund' });

    const res = await DELETE(new NextRequest('http://localhost/api/fund-sources/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', table_affected: 'FundSource' }));
  });
});