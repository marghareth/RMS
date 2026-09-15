// FILE: src/app/api/certificates/bulk-release/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    certificate: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '7', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/certificates/bulk-release', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function cert(overrides: Partial<any> = {}) {
  return { id: 1, certificate_no: 'CERT-2026-000001', queue_number: 'Q-2026-0001', status: 'PENDING', ...overrides };
}

describe('POST /api/certificates/bulk-release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '7', role: 'ADMIN' } } });
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await POST(makeReq({ ids: [1] }));
    expect(res.status).toBe(401);
  });

  it('rejects an empty ids array (schema validation)', async () => {
    const res = await POST(makeReq({ ids: [] }));
    expect(res.status).toBe(400);
    expect(prisma.certificate.findMany).not.toHaveBeenCalled();
  });

  it('releases every PENDING/PROCESSING certificate in the batch', async () => {
    (prisma.certificate.findMany as any).mockResolvedValue([
      cert({ id: 1, status: 'PENDING' }),
      cert({ id: 2, status: 'PROCESSING' }),
    ]);
    (prisma.certificate.update as any).mockResolvedValue({});

    const res = await POST(makeReq({ ids: [1, 2] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.released).toEqual([1, 2]);
    expect(body.skipped).toEqual([]);
    expect(prisma.certificate.update).toHaveBeenCalledTimes(2);
    expect(prisma.certificate.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'RELEASED', issued_at: expect.any(Date) },
    });
  });

  it('skips (does not update) a certificate that is already RELEASED or CANCELLED, and reports why', async () => {
    (prisma.certificate.findMany as any).mockResolvedValue([
      cert({ id: 1, status: 'RELEASED' }),
      cert({ id: 2, status: 'CANCELLED' }),
    ]);

    const res = await POST(makeReq({ ids: [1, 2] }));
    const body = await res.json();

    expect(body.released).toEqual([]);
    expect(body.skipped).toEqual([
      { id: 1, reason: 'Already released' },
      { id: 2, reason: 'Already cancelled' },
    ]);
    expect(prisma.certificate.update).not.toHaveBeenCalled();
  });

  it('skips an id that does not exist in the database without failing the whole batch', async () => {
    (prisma.certificate.findMany as any).mockResolvedValue([cert({ id: 1, status: 'PENDING' })]);
    (prisma.certificate.update as any).mockResolvedValue({});

    const res = await POST(makeReq({ ids: [1, 999] }));
    const body = await res.json();

    expect(body.released).toEqual([1]);
    expect(body.skipped).toEqual([{ id: 999, reason: 'Not found' }]);
  });

  it('logs one audit entry per released certificate, not per requested id', async () => {
    (prisma.certificate.findMany as any).mockResolvedValue([
      cert({ id: 1, status: 'PENDING' }),
      cert({ id: 2, status: 'CANCELLED' }),
    ]);
    (prisma.certificate.update as any).mockResolvedValue({});

    await POST(makeReq({ ids: [1, 2] }));

    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 7, action: 'PROCESS', table_affected: 'Certificate', record_id: 1 })
    );
  });

  it('processes a mixed batch and reports both released and skipped correctly', async () => {
    (prisma.certificate.findMany as any).mockResolvedValue([
      cert({ id: 1, status: 'PENDING' }),
      cert({ id: 2, status: 'PROCESSING' }),
      cert({ id: 3, status: 'RELEASED' }),
    ]);
    (prisma.certificate.update as any).mockResolvedValue({});

    const res = await POST(makeReq({ ids: [1, 2, 3, 4] }));
    const body = await res.json();

    expect(body.released).toEqual([1, 2]);
    expect(body.skipped).toEqual([
      { id: 3, reason: 'Already released' },
      { id: 4, reason: 'Not found' },
    ]);
  });
});