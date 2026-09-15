// FILE: src/app/api/appropriations/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { appropriation: { findMany: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/appropriations', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/appropriations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists appropriations filtered by category', async () => {
    (prisma.appropriation.findMany as any).mockResolvedValue([{ id: 1, item_name: 'Office Supplies' }]);
    const res = await GET(new NextRequest('http://localhost/api/appropriations?category=MOOE'));
    expect(res.status).toBe(200);
    const where = (prisma.appropriation.findMany as any).mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('MOOE');
  });
});

describe('POST /api/appropriations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults appropriated/obligated/disbursed amounts to 0 and status to PENDING', async () => {
    (prisma.appropriation.create as any).mockResolvedValue({ id: 1, item_name: 'Office Supplies' });

    await POST(makeReq({ item_name: 'Office Supplies', category: 'MOOE' }));

    const createArgs = (prisma.appropriation.create as any).mock.calls[0][0];
    expect(createArgs.data.appropriated_amount).toBe(0);
    expect(createArgs.data.obligated_amount).toBe(0);
    expect(createArgs.data.disbursed_amount).toBe(0);
    expect(createArgs.data.status).toBe('PENDING');
  });

  it('logs an audit entry', async () => {
    (prisma.appropriation.create as any).mockResolvedValue({ id: 2, item_name: 'Repairs', category: 'MOOE' });
    await POST(makeReq({ item_name: 'Repairs', category: 'MOOE' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'Appropriation', record_id: 2 })
    );
  });

  it('rejects a negative appropriated_amount (schema validation)', async () => {
    const res = await POST(makeReq({ item_name: 'Bad item', category: 'MOOE', appropriated_amount: -5 }));
    expect(res.status).toBe(400);
    expect(prisma.appropriation.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid category', async () => {
    const res = await POST(makeReq({ item_name: 'Item', category: 'INVALID' }));
    expect(res.status).toBe(400);
  });
});