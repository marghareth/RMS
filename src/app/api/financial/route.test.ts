// FILE: src/app/api/financial/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { financialRecord: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/financial', { method: 'POST', body: JSON.stringify(body) });
}

// Prisma's Decimal type has a real toJSON() that stringifies; simulate that.
function decimal(value: number) {
  return { toJSON: () => String(value), valueOf: () => value, toString: () => String(value) };
}

describe('GET /api/financial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.financialRecord.findMany as any).mockResolvedValue([]);
    (prisma.financialRecord.count as any).mockResolvedValue(0);
    (prisma.financialRecord.groupBy as any).mockResolvedValue([]);
  });

  it('computes income/expense totals from the groupBy summary as real numbers', async () => {
    (prisma.financialRecord.groupBy as any).mockResolvedValue([
      { transaction_type: 'INCOME', _sum: { amount: decimal(50000) } },
      { transaction_type: 'EXPENSE', _sum: { amount: decimal(12000) } },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/financial'));
    const body = await res.json();

    expect(body.income).toBe(50000);
    expect(body.expense).toBe(12000);
    expect(typeof body.income).toBe('number');
  });

  it('defaults income/expense to 0 when there are no records of that type', async () => {
    (prisma.financialRecord.groupBy as any).mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/financial'));
    const body = await res.json();
    expect(body.income).toBe(0);
    expect(body.expense).toBe(0);
  });

  it('converts each record amount to a real number, not a Decimal/string', async () => {
    (prisma.financialRecord.findMany as any).mockResolvedValue([
      { id: 1, transaction_type: 'INCOME', amount: decimal(1234.56) },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/financial'));
    const body = await res.json();
    expect(body.records[0].amount).toBe(1234.56);
    expect(typeof body.records[0].amount).toBe('number');
  });

  it('combines transaction_type and date range filters', async () => {
    await GET(new NextRequest('http://localhost/api/financial?transaction_type=EXPENSE&date_from=2026-01-01&date_to=2026-12-31'));
    const where = (prisma.financialRecord.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ transaction_type: 'EXPENSE' });
  });
});

describe('POST /api/financial', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps recorded_by and converts the returned Decimal amount to a number', async () => {
    (prisma.financialRecord.create as any).mockResolvedValue({
      id: 1, transaction_type: 'INCOME', amount: decimal(500),
    });

    const res = await POST(makeReq({ transaction_type: 'INCOME', amount: 500, description: 'Market fees', transaction_date: '2026-01-01' }));
    expect(res.status).toBe(201);

    const createArgs = (prisma.financialRecord.create as any).mock.calls[0][0];
    expect(createArgs.data.recorded_by).toBe(1);

    const body = await res.json();
    expect(body.amount).toBe(500);
    expect(typeof body.amount).toBe('number');
  });

  it('logs an audit entry', async () => {
    (prisma.financialRecord.create as any).mockResolvedValue({ id: 2, transaction_type: 'EXPENSE', amount: decimal(200) });
    await POST(makeReq({ transaction_type: 'EXPENSE', amount: 200, description: 'Supplies', transaction_date: '2026-01-01' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'FinancialRecord', record_id: 2 })
    );
  });

  it('rejects an invalid transaction_type (schema validation)', async () => {
    const res = await POST(makeReq({ transaction_type: 'TRANSFER', amount: 500, description: 'x', transaction_date: '2026-01-01' }));
    expect(res.status).toBe(400);
    expect(prisma.financialRecord.create).not.toHaveBeenCalled();
  });
});