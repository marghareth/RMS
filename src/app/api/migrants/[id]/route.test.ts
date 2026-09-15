// FILE: src/app/api/migrants/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { migrant: { update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/migrants/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('PATCH /api/migrants/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears reason to null when explicitly set, leaves it alone when omitted', async () => {
    (prisma.migrant.update as any).mockResolvedValue({ id: 1, name: 'Juan' });
    await PATCH(makeReq({ reason: null }), makeContext('1'));
    let updateArgs = (prisma.migrant.update as any).mock.calls[0][0];
    expect(updateArgs.data.reason).toBeNull();

    vi.clearAllMocks();
    (prisma.migrant.update as any).mockResolvedValue({ id: 1, name: 'Juan' });
    await PATCH(makeReq({ has_returned: true }), makeContext('1'));
    updateArgs = (prisma.migrant.update as any).mock.calls[0][0];
    expect(updateArgs.data.reason).toBeUndefined();
    expect(updateArgs.data.has_returned).toBe(true);
  });

  it('logs an audit entry', async () => {
    (prisma.migrant.update as any).mockResolvedValue({ id: 1, name: 'Juan' });
    await PATCH(makeReq({ has_returned: true }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'Migrant', record_id: 1 })
    );
  });
});

describe('DELETE /api/migrants/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes and logs an audit entry naming the migrant', async () => {
    (prisma.migrant.delete as any).mockResolvedValue({ id: 1, name: 'Juan Dela Cruz' });
    const res = await DELETE(new NextRequest('http://localhost/api/migrants/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', table_affected: 'Migrant', details: expect.stringContaining('Juan Dela Cruz') })
    );
  });
});