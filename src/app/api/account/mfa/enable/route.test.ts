// FILE: src/app/api/account/mfa/enable/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

describe('POST /api/account/mfa/enable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not reissue backup codes when MFA is already enabled', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 1, username: 'admin', mfa_enabled: true, mfa_secret: 'JBSWY3DPEHPK3PXP' });

    const res = await POST(
      new NextRequest('http://localhost/api/account/mfa/enable', { method: 'POST', body: JSON.stringify({ token: '123456' }) })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('MFA_ALREADY_ENABLED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
