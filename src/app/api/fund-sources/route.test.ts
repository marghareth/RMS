// FILE: src/app/api/fund-sources/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { fundSource: { findMany: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

describe('GET /api/fund-sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('lists fund sources ordered by name', async () => {
    (prisma.fundSource.findMany as any).mockResolvedValue([{ id: 1, name: 'General Fund' }]);
    const res = await GET(new NextRequest('http://localhost/api/fund-sources'));
    expect(res.status).toBe(200);
    expect((prisma.fundSource.findMany as any).mock.calls[0][0].orderBy).toEqual({ name: 'asc' });
  });
});

describe('POST /api/fund-sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  function makeReq(body: unknown) {
    return new NextRequest('http://localhost/api/fund-sources', { method: 'POST', body: JSON.stringify(body) });
  }

  it('seeds current_balance from original_balance on creation', async () => {
    (prisma.fundSource.create as any).mockResolvedValue({ id: 1, name: '20% Development Fund' });

    await POST(makeReq({ name: '20% Development Fund', original_balance: 500000 }));

    const createArgs = (prisma.fundSource.create as any).mock.calls[0][0];
    expect(createArgs.data.original_balance).toBe(500000);
    expect(createArgs.data.current_balance).toBe(500000);
    expect(createArgs.data.status).toBe('ACTIVE');
  });

  it('defaults current_balance to 0 when original_balance is omitted', async () => {
    (prisma.fundSource.create as any).mockResolvedValue({ id: 2, name: 'General Fund' });

    await POST(makeReq({ name: 'General Fund' }));

    const createArgs = (prisma.fundSource.create as any).mock.calls[0][0];
    expect(createArgs.data.current_balance).toBe(0);
  });

  it('logs an audit entry on creation', async () => {
    (prisma.fundSource.create as any).mockResolvedValue({ id: 3, name: 'Trust Fund' });
    await POST(makeReq({ name: 'Trust Fund' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'FundSource', record_id: 3 })
    );
  });

  it('rejects a negative original_balance (schema validation)', async () => {
    const res = await POST(makeReq({ name: 'Bad Fund', original_balance: -1 }));
    expect(res.status).toBe(400);
    expect(prisma.fundSource.create).not.toHaveBeenCalled();
  });
});