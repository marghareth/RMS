// FILE: src/app/api/users/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => {
  const prisma: any = {
    user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  };
  // Interactive transaction: run the callback against the same mocked client.
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}));

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) } as any;
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/users/1', { method: 'PATCH', body: JSON.stringify(body) });
}

describe('GET /api/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/users/99'), makeContext('99'));
    expect(res.status).toBe(404);
  });

  it('never selects password_hash', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, username: 'admin' });
    await GET(new NextRequest('http://localhost/api/users/1'), makeContext('1'));
    const selectArgs = (prisma.user.findUnique as any).mock.calls[0][0].select;
    expect(selectArgs).not.toHaveProperty('password_hash');
  });
});

describe('PATCH /api/users/[id] — last-admin protection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s when the target user does not exist', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await PATCH(makeReq({ role: 'ENCODER' }), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('blocks demoting the sole active admin to a non-admin role', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(0); // no other active admins

    const res = await PATCH(makeReq({ role: 'ENCODER' }), makeContext('1'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('LAST_ADMIN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks deactivating the sole active admin via is_active: false', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(0);

    const res = await PATCH(makeReq({ is_active: false }), makeContext('1'));
    expect(res.status).toBe(409);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows demoting an admin when another active admin exists', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(1); // one other active admin
    (prisma.user.update as any).mockResolvedValue({ id: 1, username: 'x', role: 'ENCODER', is_active: true });

    const res = await PATCH(makeReq({ role: 'ENCODER' }), makeContext('1'));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('does not even run the last-admin count check for a non-admin target', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });
    (prisma.user.update as any).mockResolvedValue({ id: 5, username: 'x', role: 'BHW', is_active: true });

    const res = await PATCH(makeReq({ role: 'BHW' }), makeContext('5'));
    expect(res.status).toBe(200);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("resolves omitted role/is_active from the EXISTING record rather than treating them as undefined/false", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(0); // sole active admin
    (prisma.user.update as any).mockResolvedValue({ id: 1, username: 'x', role: 'ADMIN', is_active: true });

    const res = await PATCH(makeReq({}), makeContext('1'));

    expect(res.status).toBe(200);
    const updateArgs = (prisma.user.update as any).mock.calls[0][0];
    expect(updateArgs.data.role).toBe('ADMIN');
    expect(updateArgs.data.is_active).toBe(true);
  });

  it('refuses to set a password directly (admins issue a temporary one via Reset password)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });

    const res = await PATCH(makeReq({ password: 'newlongpassword1' }), makeContext('5'));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('PASSWORD_VIA_RESET');
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('logs an audit entry on a successful update', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });
    (prisma.user.update as any).mockResolvedValue({ id: 5, username: 'x' });
    await PATCH(makeReq({ role: 'BHW' }), makeContext('5'));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', table_affected: 'User', record_id: 5 }), expect.anything());
  });
});

describe('PATCH/DELETE /api/users/[id] — only an Admin manages Admin accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stops a Secretary from promoting someone (or themselves) to Admin', async () => {
    (requirePermission as any).mockResolvedValueOnce({ session: { user: { id: '3', role: 'SECRETARY' } } });
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'SECRETARY', is_active: true });

    const res = await PATCH(makeReq({ role: 'ADMIN' }), makeContext('3'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('ADMIN_ONLY');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stops a Secretary from deactivating an Admin', async () => {
    (requirePermission as any).mockResolvedValueOnce({ session: { user: { id: '3', role: 'SECRETARY' } } });
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });

    const res = await DELETE(new NextRequest('http://localhost/api/users/1'), makeContext('1'));
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('lets a Secretary edit a non-Admin account', async () => {
    (requirePermission as any).mockResolvedValueOnce({ session: { user: { id: '3', role: 'SECRETARY' } } });
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });
    (prisma.user.update as any).mockResolvedValue({ id: 6, username: 'x', role: 'BHW', is_active: true });

    const res = await PATCH(makeReq({ role: 'BHW' }), makeContext('6'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/users/[id] (soft deactivate) — last-admin protection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks deactivating the sole active admin', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(0);

    const res = await DELETE(new NextRequest('http://localhost/api/users/1'), makeContext('1'));
    expect(res.status).toBe(409);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows deactivating an admin when another active admin exists', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ADMIN', is_active: true });
    (prisma.user.count as any).mockResolvedValue(1);
    (prisma.user.update as any).mockResolvedValue({ id: 1, is_active: false });

    const res = await DELETE(new NextRequest('http://localhost/api/users/1'), makeContext('1'));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { is_active: false } });
  });

  it('never runs the admin-count check for a non-admin or already-inactive user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });
    (prisma.user.update as any).mockResolvedValue({ id: 5, is_active: false });

    await DELETE(new NextRequest('http://localhost/api/users/5'), makeContext('5'));
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('logs a DEACTIVATE audit entry', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'ENCODER', is_active: true });
    (prisma.user.update as any).mockResolvedValue({ id: 5, is_active: false });
    await DELETE(new NextRequest('http://localhost/api/users/5'), makeContext('5'));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DEACTIVATE', table_affected: 'User', record_id: 5 }), expect.anything());
  });
});