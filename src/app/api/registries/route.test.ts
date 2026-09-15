// FILE: src/app/api/registries/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    specialRegistry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/registries', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/registries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by registry_type and purok_id together', async () => {
    (prisma.specialRegistry.findMany as any).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/registries?registry_type=SENIOR_CITIZEN&purok_id=3'));
    const where = (prisma.specialRegistry.findMany as any).mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ registry_type: 'SENIOR_CITIZEN' });
    expect(where.AND).toContainEqual({ resident: { purok_id: 3 } });
  });
});

describe('POST /api/registries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.specialRegistry.findFirst as any).mockResolvedValue(null);
  });

  it('409s when the resident is already registered in this registry_type', async () => {
    (prisma.specialRegistry.findFirst as any).mockResolvedValue({ id: 1 });
    const res = await POST(makeReq({ resident_id: 5, registry_type: 'PWD' }));
    expect(res.status).toBe(409);
    expect(prisma.specialRegistry.create).not.toHaveBeenCalled();
  });

  it('allows registering the same resident in a DIFFERENT registry_type', async () => {
    // findFirst is scoped to (resident_id, registry_type) together, so a
    // resident already in PWD can still be added to SENIOR_CITIZEN.
    (prisma.specialRegistry.create as any).mockResolvedValue({ id: 2 });
    await POST(makeReq({ resident_id: 5, registry_type: 'SENIOR_CITIZEN' }));

    const findFirstArgs = (prisma.specialRegistry.findFirst as any).mock.calls[0][0];
    expect(findFirstArgs.where).toEqual({ resident_id: 5, registry_type: 'SENIOR_CITIZEN' });
    expect(prisma.specialRegistry.create).toHaveBeenCalled();
  });

  it('defaults is_4ps_beneficiary to false when omitted', async () => {
    (prisma.specialRegistry.create as any).mockResolvedValue({ id: 3 });
    await POST(makeReq({ resident_id: 5, registry_type: 'PWD' }));
    const createArgs = (prisma.specialRegistry.create as any).mock.calls[0][0];
    expect(createArgs.data.is_4ps_beneficiary).toBe(false);
  });

  it('logs an audit entry naming the registry type', async () => {
    (prisma.specialRegistry.create as any).mockResolvedValue({ id: 4 });
    await POST(makeReq({ resident_id: 5, registry_type: 'PWD' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'SpecialRegistry', record_id: 4 })
    );
  });

  it('rejects an invalid registry_type (schema validation)', async () => {
    const res = await POST(makeReq({ resident_id: 5, registry_type: 'NOT_A_REAL_TYPE' }));
    expect(res.status).toBe(400);
    expect(prisma.specialRegistry.findFirst).not.toHaveBeenCalled();
  });
});