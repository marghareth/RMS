// FILE: src/app/api/residents/export/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => ({
  prisma: { resident: { count: vi.fn(), findMany: vi.fn() }, purok: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));
vi.mock('@/lib/barangay-info', () => ({ getBarangayInfo: vi.fn().mockResolvedValue({ name: 'San Jose' }) }));

describe('GET /api/residents/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', username: 'admin', role: 'ADMIN' } } });
    (prisma.resident.count as any).mockResolvedValue(1);
    (prisma.resident.findMany as any).mockResolvedValue([
      {
        fname: 'Juan', lname: 'Dela Cruz', mname: null, name_extension: null, birthdate: new Date('1990-01-15'),
        sex: 'MALE', civil_status: 'SINGLE', place_of_birth: null, religion: null, employment_status: null,
        educational_attainment: null, occupation: null, income_bracket: null, mobile: null, email: null,
        purok: null, household: null,
      },
    ]);
  });

  it('requires residents:export, which only Admin and Secretary have', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    const res = await GET(new NextRequest('http://localhost/api/residents/export'));
    expect(res.status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith('residents:export', expect.anything());
    expect(prisma.resident.findMany).not.toHaveBeenCalled();
  });

  it('returns an .xlsx built from the same filters as the list', async () => {
    const res = await GET(new NextRequest('http://localhost/api/residents/export?sex=MALE&search=juan'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml');
    expect(res.headers.get('Content-Disposition')).toMatch(/residents-\d{4}-\d{2}-\d{2}\.xlsx/);
    const where = (prisma.resident.findMany as any).mock.calls[0][0].where;
    expect(where.is_archived).toBe(false);
    expect(where.AND).toContainEqual({ sex: 'MALE' });
  });

  it('records every export in the audit log', async () => {
    await GET(new NextRequest('http://localhost/api/residents/export?sex=FEMALE'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPORT', table_affected: 'Resident', details: expect.stringContaining('female') })
    );
  });

  it('refuses an export that is impossibly large', async () => {
    (prisma.resident.count as any).mockResolvedValue(50000);
    const res = await GET(new NextRequest('http://localhost/api/residents/export'));
    expect(res.status).toBe(400);
  });
});