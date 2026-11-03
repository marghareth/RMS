// FILE: src/app/api/forgot-password/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    passwordResetRequest: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

let n = 0;
function req(username: string) {
  // A different IP each time so the per-IP limit doesn't carry over between tests.
  return new NextRequest('http://localhost/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ username }),
    headers: { 'x-forwarded-for': `10.0.0.${++n}` },
  });
}

describe('POST /api/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.passwordResetRequest.findFirst as any).mockResolvedValue(null);
  });

  it('files a request for an active account', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 5, is_active: true });
    const res = await POST(req('encoder1'));
    expect(res.status).toBe(200);
    expect(prisma.passwordResetRequest.create).toHaveBeenCalledWith({ data: { user_id: 5 } });
  });

  it('gives the exact same reply for an unknown username, and files nothing', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 5, is_active: true });
    const known = await (await POST(req('encoder2'))).json();
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const unknown = await (await POST(req('nobody'))).json();
    expect(unknown).toEqual(known);
    expect(prisma.passwordResetRequest.create).toHaveBeenCalledTimes(1);
  });

  it('files nothing for a deactivated account', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 6, is_active: false });
    await POST(req('olduser'));
    expect(prisma.passwordResetRequest.create).not.toHaveBeenCalled();
  });

  it('does not file a second request while one is still waiting', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 7, is_active: true });
    (prisma.passwordResetRequest.findFirst as any).mockResolvedValue({ id: 1 });
    await POST(req('bhw1'));
    expect(prisma.passwordResetRequest.create).not.toHaveBeenCalled();
  });

  it('stops filing after 3 requests an hour for the same username, but still replies the same', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 8, is_active: true });
    const replies = [];
    for (let i = 0; i < 5; i++) replies.push(await (await POST(req('kagawad9'))).json());
    expect(new Set(replies.map((r) => JSON.stringify(r))).size).toBe(1);
    expect(prisma.passwordResetRequest.create).toHaveBeenCalledTimes(3);
  });
});