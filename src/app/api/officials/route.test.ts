// FILE: src/app/api/officials/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    brgyOfficial: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/officials', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/officials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by is_active when provided', async () => {
    (prisma.brgyOfficial.findMany as any).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/officials?is_active=true'));
    expect((prisma.brgyOfficial.findMany as any).mock.calls[0][0].where).toEqual({ is_active: true });
  });

  it('returns everyone when is_active is omitted', async () => {
    (prisma.brgyOfficial.findMany as any).mockResolvedValue([]);
    await GET(new NextRequest('http://localhost/api/officials'));
    expect((prisma.brgyOfficial.findMany as any).mock.calls[0][0].where).toEqual({});
  });
});

describe('POST /api/officials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.brgyOfficial.findUnique as any).mockResolvedValue(null);
  });

  it('409s with DUPLICATE_OFFICIAL when the resident already holds an official record', async () => {
    (prisma.brgyOfficial.findUnique as any).mockResolvedValue({ id: 1 });
    const res = await POST(makeReq({ resident_id: 5, position: 'Kagawad', term_start: '2026-01-01' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('DUPLICATE_OFFICIAL');
    expect(prisma.brgyOfficial.create).not.toHaveBeenCalled();
  });

  it('defaults is_active to true when omitted', async () => {
    (prisma.brgyOfficial.create as any).mockResolvedValue({ id: 1, position: 'Kagawad' });
    await POST(makeReq({ resident_id: 5, position: 'Kagawad', term_start: '2026-01-01' }));
    const createArgs = (prisma.brgyOfficial.create as any).mock.calls[0][0];
    expect(createArgs.data.is_active).toBe(true);
  });

  it('logs an audit entry', async () => {
    (prisma.brgyOfficial.create as any).mockResolvedValue({ id: 2, position: 'Barangay Captain' });
    await POST(makeReq({ resident_id: 5, position: 'Barangay Captain', term_start: '2026-01-01' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'BrgyOfficial', record_id: 2 })
    );
  });

  it('rejects a request missing term_start (schema validation)', async () => {
    const res = await POST(makeReq({ resident_id: 5, position: 'Kagawad' }));
    expect(res.status).toBe(400);
    expect(prisma.brgyOfficial.findUnique).not.toHaveBeenCalled();
  });
});