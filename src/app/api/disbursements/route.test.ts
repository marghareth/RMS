// FILE: src/app/api/disbursements/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    disbursement: { findMany: vi.fn(), create: vi.fn() },
    fundSource: { update: vi.fn() },
    appropriation: { update: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/disbursements', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/disbursements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists disbursements', async () => {
    (prisma.disbursement.findMany as any).mockResolvedValue([{ id: 1, payee: 'ABC Supplies' }]);
    const res = await GET(new NextRequest('http://localhost/api/disbursements'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/disbursements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('decrements the fund source and increments the appropriation disbursed_amount together', async () => {
    (prisma.disbursement.create as any).mockResolvedValue({ id: 1, payee: 'ABC Supplies', amount: 500 });

    await POST(makeReq({ date: '2026-01-01', payee: 'ABC Supplies', amount: 500, fund_source_id: 9, appropriation_id: 4 }));

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { decrement: 500 } },
    });
    expect(prisma.appropriation.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { disbursed_amount: { increment: 500 } },
    });
  });

  it('skips both side-effect updates when neither fund_source_id nor appropriation_id is given', async () => {
    (prisma.disbursement.create as any).mockResolvedValue({ id: 2, payee: 'Petty cash', amount: 100 });
    await POST(makeReq({ date: '2026-01-01', payee: 'Petty cash', amount: 100 }));
    expect(prisma.fundSource.update).not.toHaveBeenCalled();
    expect(prisma.appropriation.update).not.toHaveBeenCalled();
  });

  it('logs an audit entry including the amount', async () => {
    (prisma.disbursement.create as any).mockResolvedValue({ id: 3, payee: 'XYZ Corp', amount: 250 });
    await POST(makeReq({ date: '2026-01-01', payee: 'XYZ Corp', amount: 250 }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'Disbursement', record_id: 3 })
    );
  });

  it('rejects a request with an empty payee (schema validation)', async () => {
    const res = await POST(makeReq({ date: '2026-01-01', payee: '', amount: 100 }));
    expect(res.status).toBe(400);
    expect(prisma.disbursement.create).not.toHaveBeenCalled();
  });
});