// FILE: src/app/api/certificate-templates/[type]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
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

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/certificate-templates/RESIDENCY', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('GET /api/certificate-templates/[type]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid certificate type', async () => {
    const res = await GET(new NextRequest('http://localhost/api/certificate-templates/NOT_REAL'), makeContext('NOT_REAL'));
    expect(res.status).toBe(400);
    expect(prisma.certificateTemplate.upsert).not.toHaveBeenCalled();
  });

  it('upserts using the hardcoded default content when the template does not exist yet', async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await GET(new NextRequest('http://localhost/api/certificate-templates/RESIDENCY'), makeContext('RESIDENCY'));

    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update).toEqual({}); // no-op if it already exists
    expect(upsertArgs.create.title).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.title);
  });
});

describe('PATCH /api/certificate-templates/[type]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an invalid certificate type', async () => {
    const res = await PATCH(makeReq({ title: 'New title' }), makeContext('NOT_REAL'));
    expect(res.status).toBe(400);
  });

  it('only includes explicitly-provided fields in the update branch', async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await PATCH(makeReq({ title: 'New title' }), makeContext('RESIDENCY'));

    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update).toEqual({ title: 'New title', updated_by: 1 });
    expect(upsertArgs.update).not.toHaveProperty('body');
    expect(upsertArgs.update).not.toHaveProperty('closing_line');
  });

  it('falls back to the hardcoded defaults for any field NOT provided when creating for the first time', async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await PATCH(makeReq({ title: 'Custom title' }), makeContext('RESIDENCY'));

    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.create.title).toBe('Custom title');
    expect(upsertArgs.create.body).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.body);
    expect(upsertArgs.create.closing_line).toBe(DEFAULT_CERTIFICATE_TEMPLATES.RESIDENCY.closing_line);
  });

  it('stamps updated_by with the logged-in user on the update branch', async () => {
    (prisma.certificateTemplate.upsert as any).mockResolvedValue({ certificate_type: 'RESIDENCY' });
    await PATCH(makeReq({ body: 'New body text.' }), makeContext('RESIDENCY'));
    const upsertArgs = (prisma.certificateTemplate.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update.updated_by).toBe(1);
    expect(upsertArgs.create.updated_by).toBe(1);
  });
});