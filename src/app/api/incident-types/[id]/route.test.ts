// FILE: src/app/api/incident-types/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: {
    incidentType: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    blotterCase: { count: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/incident-types/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('PATCH /api/incident-types/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.incidentType.findUnique as any).mockResolvedValue({ id: 1, name: 'Property Dispute', is_active: true });
    (prisma.incidentType.update as any).mockResolvedValue({ id: 1, name: 'Boundary Dispute', is_active: true });
  });

  it('404s when the incident type does not exist', async () => {
    (prisma.incidentType.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ name: 'x' }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('cascades the rename onto existing blotter cases when the name actually changes', async () => {
    await PATCH(makeReq({ name: 'Boundary Dispute' }), makeContext('1'));

    expect(prisma.blotterCase.updateMany).toHaveBeenCalledWith({
      where: { incident_type: 'Property Dispute' },
      data: { incident_type: 'Boundary Dispute' },
    });
  });

  it('does NOT touch blotter cases when the name is unchanged (e.g. only is_active toggled)', async () => {
    await PATCH(makeReq({ name: 'Property Dispute', is_active: false }), makeContext('1'));
    expect(prisma.blotterCase.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT touch blotter cases when name is omitted entirely', async () => {
    await PATCH(makeReq({ is_active: false }), makeContext('1'));
    expect(prisma.blotterCase.updateMany).not.toHaveBeenCalled();
  });

  it('logs an audit entry', async () => {
    await PATCH(makeReq({ name: 'Boundary Dispute' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'IncidentType', record_id: 1 })
    );
  });
});

describe('DELETE /api/incident-types/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.incidentType.findUnique as any).mockResolvedValue({ id: 1, name: 'Property Dispute' });
  });

  it('404s when the incident type does not exist', async () => {
    (prisma.incidentType.findUnique as any).mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/incident-types/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('blocks deletion with INCIDENT_TYPE_IN_USE when blotter cases still reference it', async () => {
    (prisma.blotterCase.count as any).mockResolvedValue(4);
    const res = await DELETE(new NextRequest('http://localhost/api/incident-types/1'), makeContext('1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('INCIDENT_TYPE_IN_USE');
    expect(body.message).toContain('4 blotter cases');
    expect(prisma.incidentType.delete).not.toHaveBeenCalled();
  });

  it('uses singular wording for exactly 1 case', async () => {
    (prisma.blotterCase.count as any).mockResolvedValue(1);
    const res = await DELETE(new NextRequest('http://localhost/api/incident-types/1'), makeContext('1'));
    const body = await res.json();
    expect(body.message).toContain('1 blotter case');
    expect(body.message).not.toContain('1 blotter cases');
  });

  it('allows deletion when no blotter cases reference it', async () => {
    (prisma.blotterCase.count as any).mockResolvedValue(0);
    (prisma.incidentType.delete as any).mockResolvedValue({ id: 1 });

    const res = await DELETE(new NextRequest('http://localhost/api/incident-types/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', table_affected: 'IncidentType', record_id: 1 })
    );
  });
});