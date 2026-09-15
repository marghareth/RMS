// FILE: src/app/api/search/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    resident: { findMany: vi.fn() },
    certificate: { findMany: vi.fn() },
    blotterCase: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/lib/session';

function mockAuthAs(role: string) {
  (requireAuth as any).mockResolvedValue({ session: { user: { id: '1', role } } });
}

function makeReq(q: string) {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`);
}

describe('GET /api/search — permission gating regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.resident.findMany as any).mockResolvedValue([]);
    (prisma.certificate.findMany as any).mockResolvedValue([]);
    (prisma.blotterCase.findMany as any).mockResolvedValue([]);
  });

  it('returns 401 when unauthenticated', async () => {
    (requireAuth as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await GET(makeReq('Juan'));
    expect(res.status).toBe(401);
  });

  it('403s a role with none of residents/certificates/blotter read access', async () => {
    mockAuthAs('SOME_UNMAPPED_ROLE');
    const res = await GET(makeReq('Juan'));
    expect(res.status).toBe(403);
  });

  it("ADMIN (wildcard permissions) queries and can receive all three categories", async () => {
    mockAuthAs('ADMIN');
    await GET(makeReq('Juan'));
    expect(prisma.resident.findMany).toHaveBeenCalled();
    expect(prisma.certificate.findMany).toHaveBeenCalled();
    expect(prisma.blotterCase.findMany).toHaveBeenCalled();
  });

  it('BHW (residents:read only) never queries certificates or blotter, and gets empty arrays back for them — the exact bug this endpoint used to have', async () => {
    mockAuthAs('BHW');
    (prisma.resident.findMany as any).mockResolvedValue([{ id: 1, fname: 'Juan', lname: 'Dela Cruz' }]);

    const res = await GET(makeReq('Juan'));
    const body = await res.json();

    expect(prisma.resident.findMany).toHaveBeenCalled();
    expect(prisma.certificate.findMany).not.toHaveBeenCalled();
    expect(prisma.blotterCase.findMany).not.toHaveBeenCalled();

    expect(body.residents).toHaveLength(1);
    expect(body.certificates).toEqual([]);
    expect(body.blotter).toEqual([]);
  });

  it('CAPTAIN (has all three read permissions) queries all three categories', async () => {
    mockAuthAs('CAPTAIN');
    await GET(makeReq('Juan'));
    expect(prisma.resident.findMany).toHaveBeenCalled();
    expect(prisma.certificate.findMany).toHaveBeenCalled();
    expect(prisma.blotterCase.findMany).toHaveBeenCalled();
  });

  it('returns all-empty results for a query under 2 characters without touching the database at all', async () => {
    mockAuthAs('ADMIN');
    const res = await GET(makeReq('a'));
    const body = await res.json();

    expect(body).toEqual({ residents: [], certificates: [], blotter: [] });
    expect(prisma.resident.findMany).not.toHaveBeenCalled();
  });

  it('excludes archived residents from results', async () => {
    mockAuthAs('ADMIN');
    await GET(makeReq('Juan'));
    const where = (prisma.resident.findMany as any).mock.calls[0][0].where;
    expect(where.is_archived).toBe(false);
  });
});