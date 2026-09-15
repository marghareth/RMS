// FILE: src/app/api/certificate-templates/[type]/reset/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db';
import { DEFAULT_CERTIFICATE_TEMPLATES } from '@/lib/certificateTemplateDefaults';

vi.mock('@/lib/db', () => ({
  prisma: { certificateTemplate: { upsert: vi.fn() } },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

function makeContext(type: string) {
  return { params: Promise.resolve({ type }) } as any;
}

describe('POST /api/certificate-templates/[type]/reset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid certificate type', async () => {
    const res = await POST(new NextRequest('http://localhost/api/certificate-templates/NOT_REAL/reset', { method: 'POST' }), makeContext('NOT_REAL'));
    expect(res.status).toBe(400);
    expect(prisma.certificateTemplate.upsert).not.toHaveBeenCalled();
  });

  it('restores hardcoded default content and clears updated_by to null', async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await POST(new NextRequest('http://localhost/api/certificate-templates/RESIDENCY/reset', { method: 'POST' }), makeContext('RESIDENCY'));

    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update.title).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.title);
    expect(upsertArgs.update.body).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.body);
    expect(upsertArgs.update.closing_line).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.closing_line);
    expect(upsertArgs.update.updated_by).toBeNull();
  });

  it("does NOT stamp updated_by with the current user on the create branch (it stays unset, matching a fresh row)", async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await POST(new NextRequest('http://localhost/api/certificate-templates/RESIDENCY/reset', { method: 'POST' }), makeContext('RESIDENCY'));

    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.create).not.toHaveProperty('updated_by');
  });
});