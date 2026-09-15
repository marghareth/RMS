// FILE: src/app/api/revenues/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    revenue: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fundSource: { update: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
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
  return new NextRequest('http://localhost/api/revenues/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/revenues/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/revenues/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/revenues/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the revenue does not exist', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ amount: 100 }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('applies only the delta to the same fund source when just the amount changes', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });
    (prisma.revenue.update as any).mockResolvedValue({ id: 1, amount: 700, fund_source_id: 9, source: 'RPT' });

    await PATCH(makeReq({ amount: 700 }), makeContext('1'));

    expect(prisma.fundSource.update).toHaveBeenCalledTimes(1);
    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { increment: 200 } }, // 700 - 500
    });
  });

  it('does nothing to fund source balance when amount is unchanged and fund source stays the same', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });
    (prisma.revenue.update as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });

    await PATCH(makeReq({ source: 'RPT (renamed)' }), makeContext('1'));

    expect(prisma.fundSource.update).not.toHaveBeenCalled();
  });

  it('decrements the old fund source and increments the new one when reassigned', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });
    (prisma.revenue.update as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 10, source: 'RPT' });

    await PATCH(makeReq({ fund_source_id: 10 }), makeContext('1'));

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { decrement: 500 } },
    });
    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { current_balance: { increment: 500 } },
    });
  });

  it('handles unassigning a fund source entirely (only decrements the old one)', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });
    (prisma.revenue.update as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: null, source: 'RPT' });

    await PATCH(makeReq({ fund_source_id: null }), makeContext('1'));

    expect(prisma.fundSource.update).toHaveBeenCalledTimes(1);
    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { decrement: 500 } },
    });
  });
});

describe('DELETE /api/revenues/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the revenue does not exist', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/revenues/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('decrements the linked fund source balance by the deleted amount', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: 9, source: 'RPT' });
    (prisma.revenue.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/revenues/1'), makeContext('1'));
    expect(res.status).toBe(200);

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { decrement: 500 } },
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', table_affected: 'Revenue' }));
  });

  it('skips the fund source update when the revenue had none', async () => {
    (prisma.revenue.findUnique as any).mockResolvedValue({ id: 2, amount: 500, fund_source_id: null, source: 'Misc' });
    (prisma.revenue.delete as any).mockResolvedValue({ id: 2 });

    await DELETE(new NextRequest('http://localhost/api/revenues/2'), makeContext('2'));
    expect(prisma.fundSource.update).not.toHaveBeenCalled();
  });
});