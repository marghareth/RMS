// FILE: src/app/api/blotter/[id]/updates/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    blotterUpdate: { create: vi.fn() },
    blotterCase: { update: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/blotter/1/updates', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/blotter/[id]/updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } });
  });

  it('creates an update entry and does NOT touch the case status when new_status is omitted', async () => {
    (prisma.blotterUpdate.create as any).mockResolvedValue({ id: 10, notes: 'Hearing scheduled' });

    const res = await POST(makeReq({ notes: 'Hearing scheduled' }), makeContext('1'));
    expect(res.status).toBe(201);

    expect(prisma.blotterCase.update).not.toHaveBeenCalled();
    const createArgs = (prisma.blotterUpdate.create as any).mock.calls[0][0];
    expect(createArgs.data.blotter_case_id).toBe(1);
    expect(createArgs.data.updated_by).toBe(3);
    expect(createArgs.data.new_status).toBeNull();
  });

  it('also updates the parent case status when new_status is provided', async () => {
    (prisma.blotterUpdate.create as any).mockResolvedValue({ id: 11, notes: 'Case resolved amicably' });
    (prisma.blotterCase.update as any).mockResolvedValue({ id: 1, status: 'RESOLVED' });

    const res = await POST(makeReq({ notes: 'Case resolved amicably', new_status: 'RESOLVED' }), makeContext('1'));
    expect(res.status).toBe(201);

    expect(prisma.blotterCase.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'RESOLVED' },
    });
  });

  it('logs an audit entry referencing the new update record', async () => {
    (prisma.blotterUpdate.create as any).mockResolvedValue({ id: 12, notes: 'Follow-up' });

    await POST(makeReq({ notes: 'Follow-up' }), makeContext('1'));

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 3, action: 'UPDATE', table_affected: 'BlotterUpdate', record_id: 12 })
    );
  });

  it('rejects an update with empty notes (schema validation)', async () => {
    const res = await POST(makeReq({ notes: '' }), makeContext('1'));
    expect(res.status).toBe(400);
    expect(prisma.blotterUpdate.create).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await POST(makeReq({ notes: 'x' }), makeContext('1'));
    expect(res.status).toBe(401);
  });
});