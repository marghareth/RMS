// FILE: src/app/api/puroks/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: { purok: { findMany: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/puroks', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/puroks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists puroks ordered by name with resident/household counts', async () => {
    (prisma.purok.findMany as any).mockResolvedValue([{ id: 1, name: 'Purok 1' }]);
    const res = await GET(new NextRequest('http://localhost/api/puroks'));
    expect(res.status).toBe(200);
    const call = (prisma.purok.findMany as any).mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: 'asc' });
    expect(call.include._count.select).toEqual({ residents: true, households: true });
  });
});

describe('POST /api/puroks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a purok with just a name', async () => {
    (prisma.purok.create as any).mockResolvedValue({ id: 1, name: 'Purok 5' });
    const res = await POST(makeReq({ name: 'Purok 5' }));
    expect(res.status).toBe(201);
    expect(prisma.purok.create).toHaveBeenCalledWith({ data: { name: 'Purok 5' } });
  });

  it('rejects an empty name (schema validation)', async () => {
    const res = await POST(makeReq({ name: '' }));
    expect(res.status).toBe(400);
    expect(prisma.purok.create).not.toHaveBeenCalled();
  });
});