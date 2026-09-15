// FILE: src/app/api/resident-sectors/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { Prisma } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  prisma: {
    residentSector: { create: vi.fn() },
    resident: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/resident-sectors', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/resident-sectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.resident.findUnique as any).mockResolvedValue({ id: 1, fname: 'Juan', lname: 'Dela Cruz' });
  });

  it('404s when the resident does not exist', async () => {
    (prisma.resident.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ resident_id: 999, sector_type: 'YOUTH' }));
    expect(res.status).toBe(404);
    expect(prisma.residentSector.create).not.toHaveBeenCalled();
  });

  it('creates the tag and logs an audit entry', async () => {
    (prisma.residentSector.create as any).mockResolvedValue({ id: 1, sector_type: 'YOUTH' });
    const res = await POST(makeReq({ resident_id: 1, sector_type: 'YOUTH' }));
    expect(res.status).toBe(201);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        table_affected: 'ResidentSector',
        record_id: 1,
        details: expect.stringContaining('Juan Dela Cruz'),
      })
    );
  });

  it('surfaces a duplicate tag as a clean 409 via the DB unique-constraint mapping (no manual pre-check)', async () => {
    const dupError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['resident_id', 'sector_type'] },
    });
    (prisma.residentSector.create as any).mockRejectedValue(dupError);

    const res = await POST(makeReq({ resident_id: 1, sector_type: 'YOUTH' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('DUPLICATE');
  });

  it('rejects an invalid sector_type (schema validation)', async () => {
    const res = await POST(makeReq({ resident_id: 1, sector_type: 'NOT_A_REAL_SECTOR' }));
    expect(res.status).toBe(400);
    expect(prisma.resident.findUnique).not.toHaveBeenCalled();
  });
});