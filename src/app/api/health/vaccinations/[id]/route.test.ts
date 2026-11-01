// FILE: src/app/api/health/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';

// $transaction runs its callback with the same mocked client, so the
// update/delete and the audit write can both be asserted on.
vi.mock('@/lib/db', () => {
  const healthRecord = { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const prisma: any = { healthRecord };
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '7', role: 'BHW' } } }),
}));

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as any;
const req = (method: string, body?: unknown) =>
  new NextRequest('http://localhost/api/health/1', { method, ...(body ? { body: JSON.stringify(body) } : {}) });

const RECORD = {
  id: 1, resident_id: 5, record_type: 'Hypertension', notes: 'BP 150/95',
  resident: { id: 5, fname: 'Maria', lname: 'Dela Cruz', purok: { id: 1, name: 'Purok I' } },
  recorder: { id: 7, username: 'bhw1' },
};

describe('GET /api/health/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the record with the resident, their purok, and the recorder', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue(RECORD);
    const res = await GET(req('GET'), ctx('1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RECORD);
    const args = (prisma.healthRecord.findUnique as any).mock.calls[0][0];
    expect(args.where).toEqual({ id: 1 });
    expect(args.include.resident.include.purok).toBeTruthy();
    expect(args.include.recorder).toBeTruthy();
  });

  it('404s when the record does not exist', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue(null);
    expect((await GET(req('GET'), ctx('99'))).status).toBe(404);
  });

  it('400s on a non-numeric id without querying', async () => {
    expect((await GET(req('GET'), ctx('abc'))).status).toBe(400);
    expect(prisma.healthRecord.findUnique).not.toHaveBeenCalled();
  });

  it('needs health:read', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    expect((await GET(req('GET'), ctx('1'))).status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith('health:read', expect.anything());
  });
});

describe('PATCH /api/health/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates type and notes and logs the change in the same transaction', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue({ id: 1, record_type: 'Hypertension' });
    (prisma.healthRecord.update as any).mockResolvedValue({ ...RECORD, record_type: 'Diabetes' });

    const res = await PATCH(req('PATCH', { record_type: 'Diabetes', notes: 'FBS 180' }), ctx('1'));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
    const args = (prisma.healthRecord.update as any).mock.calls[0][0];
    expect(args.data).toEqual({ record_type: 'Diabetes', notes: 'FBS 180' });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'HealthRecord', record_id: 1, user_id: 7, details: expect.stringContaining('Hypertension → Diabetes') }),
      prisma
    );
  });

  it('clears notes when null is sent, and leaves the type alone when it is not sent', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue({ id: 1, record_type: 'Hypertension' });
    (prisma.healthRecord.update as any).mockResolvedValue(RECORD);
    await PATCH(req('PATCH', { notes: null }), ctx('1'));
    expect((prisma.healthRecord.update as any).mock.calls[0][0].data).toEqual({ notes: null });
  });

  it('ignores an attempt to move the record to another resident', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue({ id: 1, record_type: 'Hypertension' });
    (prisma.healthRecord.update as any).mockResolvedValue(RECORD);
    await PATCH(req('PATCH', { resident_id: 99, notes: 'x' }), ctx('1'));
    expect((prisma.healthRecord.update as any).mock.calls[0][0].data.resident_id).toBeUndefined();
  });

  it('400s when there is nothing to update', async () => {
    expect((await PATCH(req('PATCH', {}), ctx('1'))).status).toBe(400);
    expect(prisma.healthRecord.update).not.toHaveBeenCalled();
  });

  it('400s on an empty record type', async () => {
    expect((await PATCH(req('PATCH', { record_type: '   ' }), ctx('1'))).status).toBe(400);
  });

  it('404s when the record does not exist', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue(null);
    expect((await PATCH(req('PATCH', { notes: 'x' }), ctx('1'))).status).toBe(404);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('needs health:write', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    expect((await PATCH(req('PATCH', { notes: 'x' }), ctx('1'))).status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith('health:write', expect.anything());
  });
});

describe('DELETE /api/health/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the record and logs it in the same transaction', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue({ id: 1, record_type: 'Dengue', resident_id: 5 });
    const res = await DELETE(req('DELETE'), ctx('1'));
    expect(res.status).toBe(200);
    expect(prisma.healthRecord.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', table_affected: 'HealthRecord', record_id: 1, details: expect.stringContaining('Dengue') }),
      prisma
    );
  });

  it('404s when the record does not exist, without deleting or logging', async () => {
    (prisma.healthRecord.findUnique as any).mockResolvedValue(null);
    expect((await DELETE(req('DELETE'), ctx('1'))).status).toBe(404);
    expect(prisma.healthRecord.delete).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('needs health:write', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    expect((await DELETE(req('DELETE'), ctx('1'))).status).toBe(403);
  });
});