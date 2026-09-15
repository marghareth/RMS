// FILE: src/app/api/certificate-templates/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { CERTIFICATE_TYPE_VALUES } from '@/lib/certificateTemplateDefaults';

vi.mock('@/lib/db', () => ({
  prisma: { certificateTemplate: { findMany: vi.fn(), createMany: vi.fn() } },
}));

vi.mock('@/lib/session', () => ({
  requirePermission: vi.fn().mockResolvedValue({ session: { user: { id: '1', role: 'ADMIN' } } }),
}));

describe('GET /api/certificate-templates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-seeds every certificate type when none exist yet', async () => {
    (prisma.certificateTemplate.findMany as any)
      .mockResolvedValueOnce([]) // first read: nothing exists
      .mockResolvedValueOnce(CERTIFICATE_TYPE_VALUES.map((t) => ({ certificate_type: t }))); // after seeding

    await GET(new NextRequest('http://localhost/api/certificate-templates'));

    expect(prisma.certificateTemplate.createMany).toHaveBeenCalledTimes(1);
    const createManyArgs = (prisma.certificateTemplate.createMany as any).mock.calls[0][0];
    expect(createManyArgs.data).toHaveLength(CERTIFICATE_TYPE_VALUES.length);
    expect(createManyArgs.skipDuplicates).toBe(true);
  });

  it('only seeds the missing types, not ones that already have a row', async () => {
    const [firstType, ...rest] = CERTIFICATE_TYPE_VALUES;
    (prisma.certificateTemplate.findMany as any)
      .mockResolvedValueOnce([{ certificate_type: firstType }])
      .mockResolvedValueOnce(CERTIFICATE_TYPE_VALUES.map((t) => ({ certificate_type: t })));

    await GET(new NextRequest('http://localhost/api/certificate-templates'));

    const createManyArgs = (prisma.certificateTemplate.createMany as any).mock.calls[0][0];
    const seededTypes = createManyArgs.data.map((d: any) => d.certificate_type);
    expect(seededTypes).not.toContain(firstType);
    expect(seededTypes).toHaveLength(rest.length);
  });

  it('skips seeding entirely when every type already has a row', async () => {
    (prisma.certificateTemplate.findMany as any).mockResolvedValue(
      CERTIFICATE_TYPE_VALUES.map((t) => ({ certificate_type: t }))
    );

    await GET(new NextRequest('http://localhost/api/certificate-templates'));
    expect(prisma.certificateTemplate.createMany).not.toHaveBeenCalled();
  });
});