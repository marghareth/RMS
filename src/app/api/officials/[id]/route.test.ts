// FILE: src/app/api/officials/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { brgyOfficial: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/officials/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/officials/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.brgyOfficial.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/officials/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/officials/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears term_end to null when explicitly set, leaves it alone when omitted', async () => {
    (prisma.brgyOfficial.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ term_end: null }), makeContext('1'));
    let updateArgs = (prisma.brgyOfficial.update as any).mock.calls[0][0];
    expect(updateArgs.data.term_end).toBeNull();

    vi.clearAllMocks();
    (prisma.brgyOfficial.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ is_active: false }), makeContext('1'));
    updateArgs = (prisma.brgyOfficial.update as any).mock.calls[0][0];
    expect(updateArgs.data.term_end).toBeUndefined();
    expect(updateArgs.data.is_active).toBe(false);
  });

  it('logs an audit entry', async () => {
    (prisma.brgyOfficial.update as any).mockResolvedValue({ id: 1 });
    await PATCH(makeReq({ is_active: false }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'BrgyOfficial', record_id: 1 })
    );
  });
});

describe('DELETE /api/officials/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes and logs an audit entry', async () => {
    (prisma.brgyOfficial.delete as any).mockResolvedValue({ id: 1 });
    const res = await DELETE(new NextRequest('http://localhost/api/officials/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', table_affected: 'BrgyOfficial', record_id: 1 })
    );
  });
});