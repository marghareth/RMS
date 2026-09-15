// FILE: src/app/api/revenues/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    revenue: { findMany: vi.fn(), create: vi.fn() },
    fundSource: { update: vi.fn() },
    // Array-form $transaction: in real Prisma this batches an array of
    // already-built query promises; here we just await them in order,
    // which is exactly what real $transaction returns to the caller.
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/revenues', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/revenues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('lists revenues', async () => {
    (prisma.revenue.findMany as any).mockResolvedValue([{ id: 1, source: 'Real Property Tax' }]);
    const res = await GET(new NextRequest('http://localhost/api/revenues'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/revenues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('increments the linked fund source balance by the revenue amount', async () => {
    (prisma.revenue.create as any).mockResolvedValue({ id: 1, source: 'Real Property Tax', amount: 500 });
    (prisma.fundSource.update as any).mockResolvedValue({ id: 9, current_balance: 1500 });

    const res = await POST(makeReq({ date: '2026-01-01', source: 'Real Property Tax', amount: 500, fund_source_id: 9 }));
    expect(res.status).toBe(201);

    expect(prisma.fundSource.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { current_balance: { increment: 500 } },
    });
  });

  it('does not touch any fund source when fund_source_id is omitted', async () => {
    (prisma.revenue.create as any).mockResolvedValue({ id: 2, source: 'Misc income', amount: 100 });

    const res = await POST(makeReq({ date: '2026-01-01', source: 'Misc income', amount: 100 }));
    expect(res.status).toBe(201);
    expect(prisma.fundSource.update).not.toHaveBeenCalled();
  });

  it('logs an audit entry including the amount', async () => {
    (prisma.revenue.create as any).mockResolvedValue({ id: 3, source: 'Business Permit Fees', amount: 750 });
    await POST(makeReq({ date: '2026-01-01', source: 'Business Permit Fees', amount: 750 }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'Revenue', record_id: 3 })
    );
  });

  it('rejects a request with an empty source (schema validation)', async () => {
    const res = await POST(makeReq({ date: '2026-01-01', source: '' }));
    expect(res.status).toBe(400);
    expect(prisma.revenue.create).not.toHaveBeenCalled();
  });
});