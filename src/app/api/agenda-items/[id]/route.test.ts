// FILE: src/app/api/agenda-items/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

vi.mock('@/lib/db', () => ({
  prisma: { agendaItem: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/agenda-items/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('PATCH /api/agenda-items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.agendaItem.findUnique as any).mockResolvedValue({ id: 1, title: 'Existing item', sort_order: 3 });
  });

  it('404s when the agenda item does not exist', async () => {
    (prisma.agendaItem.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ title: 'x' }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('does NOT reset sort_order to 0 when a PATCH omits it (regression test)', async () => {
    // Before the schema fix, editing just the title used to silently
    // write sort_order: 0 into the database because
    // agendaItemUpdateSchema.partial() didn't clear .default(0). See
    // validations.ts for the fix.
    (prisma.agendaItem.update as any).mockResolvedValue({ id: 1, title: 'Renamed item' });

    await PATCH(makeReq({ title: 'Renamed item' }), makeContext('1'));

    const updateArgs = (prisma.agendaItem.update as any).mock.calls[0][0];
    expect(updateArgs.data.sort_order).toBeUndefined();
  });

  it('does update sort_order when explicitly provided (e.g. drag-and-drop reorder)', async () => {
    (prisma.agendaItem.update as any).mockResolvedValue({ id: 1, sort_order: 7 });
    await PATCH(makeReq({ sort_order: 7 }), makeContext('1'));
    const updateArgs = (prisma.agendaItem.update as any).mock.calls[0][0];
    expect(updateArgs.data.sort_order).toBe(7);
  });

  it('logs an audit entry', async () => {
    (prisma.agendaItem.update as any).mockResolvedValue({ id: 1, title: 'Item', meeting_id: 5 });
    await PATCH(makeReq({ title: 'Item' }), makeContext('1'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', table_affected: 'AgendaItem', record_id: 1 })
    );
  });
});

describe('DELETE /api/agenda-items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.agendaItem.findUnique as any).mockResolvedValue({ id: 1, title: 'Item', meeting_id: 5 });
  });

  it('404s when the agenda item does not exist', async () => {
    (prisma.agendaItem.findUnique as any).mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/agenda-items/1'), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('deletes the item and logs an audit entry', async () => {
    (prisma.agendaItem.delete as any).mockResolvedValue({ id: 1 });
    const res = await DELETE(new NextRequest('http://localhost/api/agenda-items/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', table_affected: 'AgendaItem', record_id: 1 })
    );
  });
});