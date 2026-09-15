// FILE: src/app/api/barangay-id/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    barangayId: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    resident: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/barangay-id', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/barangay-id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by resident_id when provided', async () => {
    (prisma.barangayId.findMany as any).mockResolvedValue([]);
    (prisma.barangayId.count as any).mockResolvedValue(0);
    await GET(new NextRequest('http://localhost/api/barangay-id?resident_id=5'));
    expect((prisma.barangayId.findMany as any).mock.calls[0][0].where).toEqual({ resident_id: 5 });
  });
});

describe('POST /api/barangay-id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.resident.findUnique as any).mockResolvedValue({ id: 1, fname: 'Juan', lname: 'Dela Cruz' });
    (prisma.barangayId.findFirst as any).mockResolvedValue(null);
    (prisma.barangayId.findUnique as any).mockResolvedValue(null);
  });

  it('404s when the resident does not exist', async () => {
    (prisma.resident.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ resident_id: 999 }));
    expect(res.status).toBe(404);
    expect(prisma.barangayId.create).not.toHaveBeenCalled();
  });

  it('409s with DUPLICATE_ID when the resident already has a barangay ID on file', async () => {
    (prisma.barangayId.findFirst as any).mockResolvedValue({ id: 5, id_number: 'BID-2026-123456' });
    const res = await POST(makeReq({ resident_id: 1 }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('DUPLICATE_ID');
    expect(prisma.barangayId.create).not.toHaveBeenCalled();
  });

  it('generates an id_number in the BID-<year>-<6 digits> format and creates the record', async () => {
    (prisma.barangayId.create as any).mockResolvedValue({ id: 10, id_number: 'BID-2026-123456' });

    const res = await POST(makeReq({ resident_id: 1 }));
    expect(res.status).toBe(201);

    const createArgs = (prisma.barangayId.create as any).mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(createArgs.data.id_number).toMatch(new RegExp(`^BID-${year}-\\d{6}$`));
    expect(createArgs.data.issued_by).toBe(1);
  });

  it('retries id_number generation until a unique one is found', async () => {
    (prisma.barangayId.findUnique as any)
      .mockResolvedValueOnce({ id: 1 }) // collision
      .mockResolvedValueOnce(null); // free
    (prisma.barangayId.create as any).mockResolvedValue({ id: 11, id_number: 'BID-2026-654321' });

    const res = await POST(makeReq({ resident_id: 1 }));
    expect(res.status).toBe(201);
    expect(prisma.barangayId.findUnique).toHaveBeenCalledTimes(2);
  });

  it('logs an audit entry', async () => {
    (prisma.barangayId.create as any).mockResolvedValue({ id: 12, id_number: 'BID-2026-111111' });
    await POST(makeReq({ resident_id: 1 }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'BarangayId', record_id: 12 })
    );
  });

  it('rejects a request missing resident_id (schema validation)', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(prisma.resident.findUnique).not.toHaveBeenCalled();
  });
});