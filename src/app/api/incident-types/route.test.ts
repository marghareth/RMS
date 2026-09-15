// FILE: src/app/api/incident-types/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    incidentType: { findMany: vi.fn(), create: vi.fn() },
    blotterCase: { groupBy: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/incident-types', { method: 'POST', body: JSON.stringify(body) });
}

describe('GET /api/incident-types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges the blotter case usage count onto each incident type by name', async () => {
    (prisma.incidentType.findMany as any).mockResolvedValue([
      { id: 1, name: 'Property Dispute' },
      { id: 2, name: 'Noise Complaint' },
    ]);
    (prisma.blotterCase.groupBy as any).mockResolvedValue([{ incident_type: 'Property Dispute', _count: 7 }]);

    const res = await GET(new NextRequest('http://localhost/api/incident-types'));
    const body = await res.json();

    expect(body[0]).toMatchObject({ name: 'Property Dispute', _count: { blotter_cases: 7 } });
    expect(body[1]).toMatchObject({ name: 'Noise Complaint', _count: { blotter_cases: 0 } });
  });
});

describe('POST /api/incident-types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and logs an audit entry', async () => {
    (prisma.incidentType.create as any).mockResolvedValue({ id: 3, name: 'Theft' });
    const res = await POST(makeReq({ name: 'Theft' }));
    expect(res.status).toBe(201);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', table_affected: 'IncidentType', record_id: 3 })
    );
  });

  it('rejects an empty name (schema validation)', async () => {
    const res = await POST(makeReq({ name: '' }));
    expect(res.status).toBe(400);
    expect(prisma.incidentType.create).not.toHaveBeenCalled();
  });
});