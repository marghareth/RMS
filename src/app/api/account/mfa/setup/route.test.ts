// FILE: src/app/api/account/mfa/setup/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

const req = () => new NextRequest('http://localhost/api/account/mfa/setup', { method: 'POST' });

describe('POST /api/account/mfa/setup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to replace the secret once MFA is enabled', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, username: 'admin', mfa_enabled: true, mfa_secret: 'EXISTING' });

    const res = await POST(req());

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('MFA_ALREADY_ENABLED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('issues a pending secret when MFA is not yet enabled', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, username: 'admin', mfa_enabled: false, mfa_secret: null });

    const res = await POST(req());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.secret).toMatch(/^[A-Z2-7]+$/);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { mfa_secret: body.secret } });
  });
});
