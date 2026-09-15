// FILE: src/app/api/blotter/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    blotterCase: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

describe('GET /api/blotter/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } });
  });

  it('returns 404 when the case does not exist', async () => {
    (prisma.blotterCase.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/blotter/999'), makeContext('999'));
    expect(res.status).toBe(404);
  });

  it('returns the case with its updates when found', async () => {
    (prisma.blotterCase.findUnique as any).mockResolvedValue({ id: 1, case_number: 'BLT-2026-1234', updates: [] });
    const res = await GET(new NextRequest('http://localhost/api/blotter/1'), makeContext('1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.case_number).toBe('BLT-2026-1234');
  });
});

describe('PATCH /api/blotter/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } });
  });

  function makeReq(body: unknown) {
    return new NextRequest('http://localhost/api/blotter/1', { method: 'PATCH', body: JSON.stringify(body) });
  }

  it('updates status/escalated fields and logs an audit entry', async () => {
    (prisma.blotterCase.update as any).mockResolvedValue({ id: 1, case_number: 'BLT-2026-1234', status: 'RESOLVED' });

    const res = await PATCH(makeReq({ status: 'RESOLVED', escalated: true }), makeContext('1'));
    expect(res.status).toBe(200);

    const updateArgs = (prisma.blotterCase.update as any).mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.status).toBe('RESOLVED');
    expect(updateArgs.data.escalated).toBe(true);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 3, action: 'UPDATE', table_affected: 'BlotterCase', record_id: 1 })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await PATCH(makeReq({ status: 'RESOLVED' }), makeContext('1'));
    expect(res.status).toBe(401);
  });
});