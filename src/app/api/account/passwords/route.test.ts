// FILE: src/app/api/account/password/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/db', () => {
  const prisma: any = { user: { findUnique: vi.fn(), update: vi.fn() } };
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({ session: { user: { id: '5', role: 'ENCODER' } } }),
}));
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn().mockResolvedValue('new-hash') },
}));

const user = {
  id: 5,
  username: 'encoder1',
  password_hash: 'old-hash',
  must_change_password: false,
  temp_password_expires_at: null as Date | null,
};

function req(body: unknown) {
  return new NextRequest('http://localhost/api/account/password', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/account/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({ ...user });
  });

  it('rejects a wrong current password without changing anything', async () => {
    (bcrypt.compare as any).mockResolvedValue(false);
    const res = await POST(req({ currentPassword: 'nope', newPassword: 'Sampaguita-2026' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_PASSWORD');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a weak new password', async () => {
    (bcrypt.compare as any).mockResolvedValue(true);
    const res = await POST(req({ currentPassword: 'right', newPassword: 'barangay123' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('WEAK_PASSWORD');
  });

  it('rejects reusing the current password', async () => {
    (bcrypt.compare as any).mockResolvedValue(true); // matches both times
    const res = await POST(req({ currentPassword: 'Sampaguita-2026', newPassword: 'Sampaguita-2026' }));
    expect((await res.json()).error).toBe('SAME_PASSWORD');
  });

  it('refuses an expired temporary password', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      ...user,
      must_change_password: true,
      temp_password_expires_at: new Date(Date.now() - 1000),
    });
    (bcrypt.compare as any).mockResolvedValue(true);
    const res = await POST(req({ currentPassword: 'temp', newPassword: 'Sampaguita-2026' }));
    expect((await res.json()).error).toBe('TEMP_PASSWORD_EXPIRED');
  });

  it('saves the new hash, clears the temporary-password flags, signs out other sessions and audits', async () => {
    (bcrypt.compare as any).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const res = await POST(req({ currentPassword: 'right', newPassword: 'Sampaguita-2026' }));
    expect(res.status).toBe(200);
    const data = (prisma.user.update as any).mock.calls[0][0].data;
    expect(data).toMatchObject({ password_hash: 'new-hash', must_change_password: false, temp_password_expires_at: null });
    expect(data.password_changed_at).toBeInstanceOf(Date);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'PASSWORD_CHANGED', record_id: 5 }), expect.anything());
  });
});