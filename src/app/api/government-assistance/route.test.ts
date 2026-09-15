// FILE: src/app/api/government-assistance/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    governmentAssistance: { create: vi.fn() },
    resident: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/government-assistance', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/government-assistance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.resident.findUnique as any).mockResolvedValue({ id: 1, fname: 'Juan', lname: 'Dela Cruz' });
  });

  it('404s when the resident does not exist', async () => {
    (prisma.resident.findUnique as any).mockResolvedValue(null);
    const res = await POST(makeReq({ resident_id: 999, program_name: '4Ps' }));
    expect(res.status).toBe(404);
    expect(prisma.governmentAssistance.create).not.toHaveBeenCalled();
  });

  it('creates the record and logs an audit entry naming the resident and program', async () => {
    (prisma.governmentAssistance.create as any).mockResolvedValue({ id: 5, program_name: '4Ps' });
    const res = await POST(makeReq({ resident_id: 1, program_name: '4Ps' }));
    expect(res.status).toBe(201);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        table_affected: 'GovernmentAssistance',
        record_id: 5,
        details: expect.stringContaining('Juan Dela Cruz'),
      })
    );
  });

  it('rejects a request missing program_name (schema validation)', async () => {
    const res = await POST(makeReq({ resident_id: 1 }));
    expect(res.status).toBe(400);
    expect(prisma.resident.findUnique).not.toHaveBeenCalled();
  });
});