// FILE: src/app/api/pick-lists/[list]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';
import { EQUIPMENT_TYPE_DEFAULTS, REVENUE_CATEGORY_DEFAULTS } from '@/lib/category-lists';

vi.mock('@/lib/db', () => {
  const systemSetting = { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() };
  const equipment = { findMany: vi.fn() };
  const prisma: any = { systemSetting, equipment };
  prisma.$transaction = vi.fn(async (fn: (tx: any) => unknown) => fn(prisma));
  return { prisma };
});
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

const ctx = (list: string) => ({ params: Promise.resolve({ list }) });
const get = (list: string) => GET(new NextRequest(`http://localhost/api/pick-lists/${list}`), ctx(list) as any);
const put = (list: string, body: unknown) =>
  PUT(
    new NextRequest(`http://localhost/api/pick-lists/${list}`, { method: 'PUT', body: JSON.stringify(body) }),
    ctx(list) as any
  );

describe('GET /api/pick-lists/[list]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.systemSetting.findMany as any).mockResolvedValue([]);
    (prisma.systemSetting.findUnique as any).mockResolvedValue(null);
    (prisma.equipment.findMany as any).mockResolvedValue([]);
  });

  it('returns the revenue category defaults and checks revenues:read', async () => {
    const res = await get('revenue-categories');
    expect(await res.json()).toEqual({ items: REVENUE_CATEGORY_DEFAULTS });
    expect((requirePermission as any).mock.calls[0][0]).toBe('revenues:read');
  });

  it('returns a saved list in place of the defaults', async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({ key: 'list_revenue_categories', value: '["Fees"]' });
    (prisma.systemSetting.findMany as any).mockResolvedValue([{ key: 'list_revenue_categories', value: '["Fees"]' }]);
    expect(await (await get('revenue-categories')).json()).toEqual({ items: ['Fees'] });
  });

  it('adds types already used on equipment until the list is saved', async () => {
    (prisma.equipment.findMany as any).mockResolvedValue([{ asset_type: 'Tents' }, { asset_type: 'furniture' }]);
    const { items } = await (await get('equipment-types')).json();
    expect(items).toEqual([...EQUIPMENT_TYPE_DEFAULTS, 'Tents']); // "furniture" duplicates "Furniture"
    expect((requirePermission as any).mock.calls[0][0]).toBe('equipment:read');
  });

  it('answers 404 for an unknown list', async () => {
    expect((await get('nope')).status).toBe(404);
  });
});

describe('PUT /api/pick-lists/[list]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves a cleaned list with an audit entry and checks the write permission', async () => {
    const res = await put('equipment-types', { items: [' Tents ', 'Chairs', 'tents', ''] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ['Tents', 'Chairs'] });
    expect((requirePermission as any).mock.calls[0][0]).toBe('equipment:write');
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'list_equipment_types' } })
    );
    expect((logAudit as any).mock.calls[0][0].details).toBe('Updated equipment types: Tents, Chairs');
  });

  it('refuses an empty list', async () => {
    const res = await put('revenue-categories', { items: [' '] });
    expect(res.status).toBe(400);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it('stops when the user may not edit the list', async () => {
    (requirePermission as any).mockResolvedValueOnce({ error: 'Forbidden', status: 403 });
    const res = await put('revenue-categories', { items: ['Fees'] });
    expect(res.status).toBe(403);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });
});