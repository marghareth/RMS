// FILE: src/app/api/registries/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => {
  const specialRegistry = { findUnique: vi.fn(), delete: vi.fn() };
  const resident = { findUnique: vi.fn(), update: vi.fn() };
  const prisma: any = { specialRegistry, resident };
  prisma.$transaction = vi.fn(async (fn: (tx: any) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

const req = (method: string) => new NextRequest('http://localhost/api/registries/7', { method });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const ENTRY = {
  id: 7,
  resident_id: 42,
  registry_type: 'SENIOR_CITIZEN',
  disability_type: null,
  is_4ps_beneficiary: false,
  registered_at: '2026-01-01T00:00:00.000Z',
  resident: { id: 42, fname: 'Aileen', lname: 'Flores' },
};

describe('GET /api/registries/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('looks up the registry entry by its own id, not a resident', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(ENTRY);
    const res = await GET(req('GET'), ctx('7'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(7);
    expect(body.registry_type).toBe('SENIOR_CITIZEN');
    expect(body.resident.fname).toBe('Aileen');
    expect((prisma.specialRegistry.findUnique as any).mock.calls[0][0].where).toEqual({ id: 7 });
    expect(prisma.resident.findUnique).not.toHaveBeenCalled();
  });

  it('includes what the detail screens show, and only released certificates', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(ENTRY);
    await GET(req('GET'), ctx('7'));

    const include = (prisma.specialRegistry.findUnique as any).mock.calls[0][0].include.resident.include;
    expect(include.purok).toBe(true);
    expect(include.household.include._count).toEqual({ select: { members: true } });
    expect(include.certificates.where).toEqual({ status: 'RELEASED', issued_at: { not: null } });
    expect(include.barangay_ids).toBeDefined();
    expect(include.health_records).toBeDefined();
    expect(include.vaccinations).toBeDefined();
  });

  it('needs registries:read', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(ENTRY);
    await GET(req('GET'), ctx('7'));
    expect((requirePermission as any).mock.calls[0][0]).toBe('registries:read');
  });

  it('404s when the entry does not exist', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(null);
    expect((await GET(req('GET'), ctx('7'))).status).toBe(404);
  });

  it('404s on a non-numeric id without querying', async () => {
    expect((await GET(req('GET'), ctx('abc'))).status).toBe(404);
    expect(prisma.specialRegistry.findUnique).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/registries/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes the registry entry and logs it, without touching the resident', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(ENTRY);
    const res = await DELETE(req('DELETE'), ctx('7'));

    expect(res.status).toBe(200);
    expect(prisma.specialRegistry.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(prisma.resident.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();

    const [entry] = (logAudit as any).mock.calls[0];
    expect(entry).toMatchObject({ action: 'DELETE', table_affected: 'SpecialRegistry', record_id: 7 });
    expect(entry.details).toContain('Aileen Flores');
    expect(entry.details).toContain('Senior Citizen');
  });

  it('needs registries:delete', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(ENTRY);
    await DELETE(req('DELETE'), ctx('7'));
    expect((requirePermission as any).mock.calls[0][0]).toBe('registries:delete');
  });

  it('stops when the role lacks permission', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    expect((await DELETE(req('DELETE'), ctx('7'))).status).toBe(403);
    expect(prisma.specialRegistry.delete).not.toHaveBeenCalled();
  });

  it('404s when the entry does not exist, without deleting or logging', async () => {
    (prisma.specialRegistry.findUnique as any).mockResolvedValue(null);
    expect((await DELETE(req('DELETE'), ctx('7'))).status).toBe(404);
    expect(prisma.specialRegistry.delete).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });
});