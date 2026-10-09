// FILE: src/app/api/settings/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: { systemSetting: { findMany: vi.fn(), upsert: vi.fn() } },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flattens the key/value rows into a single object', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([
      { key: 'site_name', value: 'Barangay San Isidro' },
      { key: 'office_hours', value: '8AM-5PM' },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/settings'));
    const body = await res.json();

    expect(body).toEqual({ site_name: 'Barangay San Isidro', office_hours: '8AM-5PM' });
  });

  it('returns an empty object when no settings exist', async () => {
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/settings'));
    expect(await res.json()).toEqual({});
  });
});

describe('PATCH /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts every key in the request body', async () => {
    (prisma.systemSetting.upsert as any).mockResolvedValue({});
    await PATCH(makeReq({ site_name: 'New Name', max_upload_mb: 10 }));
    expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
  });

  it('coerces non-string values (numbers/booleans) to strings for storage', async () => {
    (prisma.systemSetting.upsert as any).mockResolvedValue({});
    await PATCH(makeReq({ max_upload_mb: 10, maintenance_mode: true }));

    const calls = (prisma.systemSetting.upsert as any).mock.calls;
    const maxUploadCall = calls.find((c: any) => c[0].where.key === 'max_upload_mb');
    const maintenanceCall = calls.find((c: any) => c[0].where.key === 'maintenance_mode');

    expect(maxUploadCall[0].update.value).toBe('10');
    expect(maintenanceCall[0].update.value).toBe('true');
  });

  it('rejects an unsupported value type (e.g. a nested object)', async () => {
    const res = await PATCH(makeReq({ bad_key: { nested: true } }));
    expect(res.status).toBe(400);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
});