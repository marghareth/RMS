// FILE: src/app/api/users/reset-requests/[id]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => {
  const prisma: any = {
    user: { update: vi.fn() },
    passwordResetRequest: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  };
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('temp-hash') } }));

const ctx = { params: Promise.resolve({ id: '9' }) } as any;
function req(action: string) {
  return new NextRequest('http://localhost/api/users/reset-requests/9', { method: 'POST', body: JSON.stringify({ action }) });
}
function actingAs(id: string, role: string) {
  (requirePermission as any).mockResolvedValue({ session: { user: { id, role } } });
}
function request(user: { id: number; role: string }, overrides: Record<string, unknown> = {}) {
  (prisma.passwordResetRequest.findUnique as any).mockResolvedValue({
    id: 9,
    status: 'PENDING',
    requested_at: new Date(),
    user: { username: 'someone', is_active: true, ...user },
    ...overrides,
  });
}

describe('POST /api/users/reset-requests/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approve: issues a temporary password once, expiring in 30 minutes, and forces a change', async () => {
    actingAs('3', 'SECRETARY');
    request({ id: 5, role: 'ENCODER' });
    const res = await POST(req('approve'), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.temporaryPassword).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
    const minutes = (new Date(body.expiresAt).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
    const data = (prisma.user.update as any).mock.calls[0][0].data;
    expect(data).toMatchObject({ password_hash: 'temp-hash', must_change_password: true });
    expect(data.password_hash).not.toBe(body.temporaryPassword);
  });

  it('deny: closes the request without touching the account', async () => {
    actingAs('1', 'ADMIN');
    request({ id: 5, role: 'ENCODER' });
    const res = await POST(req('deny'), ctx);
    expect(res.status).toBe(200);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect((prisma.passwordResetRequest.update as any).mock.calls[0][0].data.status).toBe('DENIED');
  });

  it("a Secretary can't approve a request for an Admin account", async () => {
    actingAs('3', 'SECRETARY');
    request({ id: 1, role: 'ADMIN' });
    const res = await POST(req('approve'), ctx);
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("nobody can approve their own request", async () => {
    actingAs('1', 'ADMIN');
    request({ id: 1, role: 'ADMIN' });
    const res = await POST(req('approve'), ctx);
    expect(res.status).toBe(403);
  });

  it('refuses a request older than 24 hours', async () => {
    actingAs('1', 'ADMIN');
    request({ id: 5, role: 'ENCODER' }, { requested_at: new Date(Date.now() - 25 * 3600 * 1000) });
    const res = await POST(req('approve'), ctx);
    expect(res.status).toBe(410);
  });

  it('roles without users:write are turned away', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    const res = await POST(req('approve'), ctx);
    expect(res.status).toBe(403);
    expect(prisma.passwordResetRequest.findUnique).not.toHaveBeenCalled();
  });
});