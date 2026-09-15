// FILE: src/app/api/migrants/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    migrant: { create: vi.fn() },
    household: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/migrants', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/migrants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.household.findUnique as any).mockResolvedValue({ id: 1, household_no: 'HHNP1000000001' });
  });

  it('404s when the household does not exist', async () => {
    (prisma.household.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ household_id: 999, name: 'Juan Dela Cruz' }));
    expect(res.status).toBe(404);
    expect(prisma.migrant.create).not.toHaveBeenCalled();
  });

  it('defaults has_returned to false when omitted', async () => {
    (prisma.migrant.create as any).mockResolvedValue({ id: 1, name: 'Juan Dela Cruz' });
    await POST(makeReq({ household_id: 1, name: 'Juan Dela Cruz' }));
    const createArgs = (prisma.migrant.create as any).mock.calls[0][0];
    expect(createArgs.data.has_returned).toBe(false);
  });

  it('logs an audit entry referencing the household_no', async () => {
    (prisma.migrant.create as any).mockResolvedValue({ id: 2, name: 'Maria Santos' });
    await POST(makeReq({ household_id: 1, name: 'Maria Santos' }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        table_affected: 'Migrant',
        record_id: 2,
        details: expect.stringContaining('HHNP1000000001'),
      })
    );
  });

  it('rejects a request missing name (schema validation)', async () => {
    const res = await POST(makeReq({ household_id: 1 }));
    expect(res.status).toBe(400);
    expect(prisma.household.findUnique).not.toHaveBeenCalled();
  });
});