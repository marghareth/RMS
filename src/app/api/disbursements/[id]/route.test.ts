// FILE: src/app/api/disbursements/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    disbursement: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fundSource: { update: vi.fn() },
    appropriation: { update: vi.fn() },
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
  return new NextRequest('http://localhost/api/disbursements/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/disbursements/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/disbursements/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/disbursements/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the disbursement does not exist', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ amount: 100 }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('applies only the delta to fund source (decrement) and appropriation (increment) when just the amount changes', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 9, appropriation_id: 4, payee: 'ABC',
    });
    (prisma.disbursement.update as any).mockResolvedValue({
      id: 1, amount: 700, fund_source_id: 9, appropriation_id: 4, payee: 'ABC',
    });

    await PATCH(makeReq({ amount: 700 }), makeContext('1'));

    // delta = 700 - 500 = 200: fund source loses the extra 200 (decrement),
    // appropriation's disbursed_amount grows by the extra 200 (increment).
    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { decrement: 200 } },
    });
    expect(prisma.appropriation.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { disbursed_amount: { increment: 200 } },
    });
  });

  it('does not touch amount when it is omitted from the PATCH body (regression: was silently treated as 0)', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 9, appropriation_id: 4, payee: 'ABC',
    });
    (prisma.disbursement.update as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 9, appropriation_id: 4, payee: 'ABC (renamed)',
    });

    await PATCH(makeReq({ payee: 'ABC (renamed)' }), makeContext('1'));

    expect(prisma.fundSource.update).not.toHaveBeenCalled();
    expect(prisma.appropriation.update).not.toHaveBeenCalled();
  });

  it('reverses old fund source/appropriation and applies the new ones when reassigned', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 9, appropriation_id: 4, payee: 'ABC',
    });
    (prisma.disbursement.update as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 10, appropriation_id: 5, payee: 'ABC',
    });

    await PATCH(makeReq({ fund_source_id: 10, appropriation_id: 5 }), makeContext('1'));

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { increment: 500 } }, // give the old fund source its money back
    });
    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { current_balance: { decrement: 500 } }, // charge the new one
    });
    expect(prisma.appropriation.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { disbursed_amount: { decrement: 500 } },
    });
    expect(prisma.appropriation.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { disbursed_amount: { increment: 500 } },
    });
  });

  it('logs an audit entry', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: null, appropriation_id: null, payee: 'ABC' });
    (prisma.disbursement.update as any).mockResolvedValue({ id: 1, amount: 500, fund_source_id: null, appropriation_id: null, payee: 'ABC' });
    await PATCH(makeReq({ payee: 'ABC' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', table_affected: 'Disbursement' }));
  });
});

describe('DELETE /api/disbursements/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the disbursement does not exist', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/disbursements/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('returns the money to the fund source and reduces the appropriation disbursed_amount', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({
      id: 1, amount: 500, fund_source_id: 9, appropriation_id: 4, payee: 'ABC',
    });
    (prisma.disbursement.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/disbursements/1'), makeContext('1'));
    expect(res.status).toBe(200);

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { increment: 500 } },
    });
    expect(prisma.appropriation.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { disbursed_amount: { decrement: 500 } },
    });
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', table_affected: 'Disbursement' }));
  });

  it('skips both side-effect updates when neither was linked', async () => {
    (prisma.disbursement.findUnique as any).mockResolvedValue({
      id: 2, amount: 100, fund_source_id: null, appropriation_id: null, payee: 'Petty cash',
    });
    (prisma.disbursement.delete as any).mockResolvedValue({ id: 2 });

    await DELETE(new NextRequest('http://localhost/api/disbursements/2'), makeContext('2'));
    expect(prisma.fundSource.update).not.toHaveBeenCalled();
    expect(prisma.appropriation.update).not.toHaveBeenCalled();
  });
});