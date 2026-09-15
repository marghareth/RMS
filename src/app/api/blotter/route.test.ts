// FILE: src/app/api/blotter/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    blotterCase: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } }),
}));

import { requirePermission } from '@/lib/session';

const validBody = {
  complainant_name: 'Juan Dela Cruz',
  respondent_name: 'Pedro Reyes',
  incident_narrative: 'A dispute over a fence boundary.',
  incident_date: '2026-05-01',
  incident_type: 'Property Dispute',
};

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/blotter', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/blotter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } });
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await GET(new NextRequest('http://localhost/api/blotter'));
    expect(res.status).toBe(401);
  });

  it('lists cases with pagination', async () => {
    (prisma.blotterCase.findMany as any).mockResolvedValue([{ id: 1, case_number: 'BLT-2026-1234' }]);
    (prisma.blotterCase.count as any).mockResolvedValue(1);

    const res = await GET(new NextRequest('http://localhost/api/blotter'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.cases).toHaveLength(1);
  });

  it('filters by escalated=true correctly (string -> boolean)', async () => {
    (prisma.blotterCase.findMany as any).mockResolvedValue([]);
    (prisma.blotterCase.count as any).mockResolvedValue(0);

    await GET(new NextRequest('http://localhost/api/blotter?escalated=true'));
    const where = (prisma.blotterCase.findMany as any).mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('"escalated":true');
  });
});

describe('POST /api/blotter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '3', role: 'ADMIN' } } });
    (prisma.blotterCase.findUnique as any).mockResolvedValue(null);
  });

  it('returns 401 when unauthenticated', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Unauthorized', status: 401 });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it('creates a case with a BLT-<year>-<4 digits> case number and logs an audit entry', async () => {
    (prisma.blotterCase.create as any).mockResolvedValue({ id: 5, case_number: 'BLT-2026-4321' });

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);

    const createArgs = (prisma.blotterCase.create as any).mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(createArgs.data.case_number).toMatch(new RegExp(`^BLT-${year}-\\d{4}$`));
    expect(createArgs.data.complainant_name).toBe('Juan Dela Cruz');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 3, action: 'CREATE', table_affected: 'BlotterCase', record_id: 5 })
    );
  });

  it('retries case number generation until a unique one is found', async () => {
    (prisma.blotterCase.findUnique as any)
      .mockResolvedValueOnce({ id: 1 }) // first generated number collides
      .mockResolvedValueOnce(null); // second attempt is free
    (prisma.blotterCase.create as any).mockResolvedValue({ id: 6, case_number: 'BLT-2026-0001' });

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    expect(prisma.blotterCase.findUnique).toHaveBeenCalledTimes(2);
  });

  it('rejects a request with a missing incident narrative (schema validation)', async () => {
    const res = await POST(makeReq({ ...validBody, incident_narrative: '' }));
    expect(res.status).toBe(400);
    expect(prisma.blotterCase.create).not.toHaveBeenCalled();
  });
});