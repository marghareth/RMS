// FILE: src/app/api/households/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    household: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    purok: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/households', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/households', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('filters by purok_id when provided', async () => {
    (prisma.household.findMany as any).mockResolvedValue([]);
    (prisma.household.count as any).mockResolvedValue(0);

    await GET(new NextRequest('http://localhost/api/households?purok_id=3'));
    expect((prisma.household.findMany as any).mock.calls[0][0].where).toEqual({ purok_id: 3 });
  });

  it('returns all households when purok_id is omitted', async () => {
    (prisma.household.findMany as any).mockResolvedValue([]);
    (prisma.household.count as any).mockResolvedValue(0);

    await GET(new NextRequest('http://localhost/api/households'));
    expect((prisma.household.findMany as any).mock.calls[0][0].where).toEqual({});
  });
});

describe('POST /api/households', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } });
  });

  it('404/400s with INVALID_PUROK when the referenced purok does not exist', async () => {
    (prisma.purok.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ purok_id: 99, address: '123 Rizal St.' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('INVALID_PUROK');
    expect(prisma.household.create).not.toHaveBeenCalled();
  });

  it('generates a household_no as HHNP1 + 9-digit sequence based on the current count', async () => {
    (prisma.purok.findUnique as any).mockResolvedValue({ id: 3, name: 'Purok 3' });
    (prisma.household.count as any).mockResolvedValue(41); // this will be the 42nd household
    (prisma.household.create as any).mockResolvedValue({ id: 1, household_no: 'HHNP1000000042' });

    await POST(makeReq({ purok_id: 3, address: '123 Rizal St.' }));

    const createArgs = (prisma.household.create as any).mock.calls[0][0];
    expect(createArgs.data.household_no).toBe('HHNP1000000042');
    expect(createArgs.data.purok_id).toBe(3);
  });

  it('logs an audit entry referencing the household_no and address', async () => {
    (prisma.purok.findUnique as any).mockResolvedValue({ id: 3, name: 'Purok 3' });
    (prisma.household.count as any).mockResolvedValue(0);
    (prisma.household.create as any).mockResolvedValue({ id: 5, household_no: 'HHNP1000000001', address: '123 Rizal St.' });

    await POST(makeReq({ purok_id: 3, address: '123 Rizal St.' }));

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'Household', record_id: 5 })
    );
  });

  it('rejects a request missing the required address (schema validation)', async () => {
    const res = await POST(makeReq({ purok_id: 3 }));
    expect(res.status).toBe(400);
    expect(prisma.purok.findUnique).not.toHaveBeenCalled();
  });
});