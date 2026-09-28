// FILE: src/lib/barangay-info.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db', () => ({
  prisma: {
    systemSetting: { findMany: vi.fn() },
    brgyOfficial: { findFirst: vi.fn() },
  },
}));

import { getBarangayInfo, getActiveCaptain } from './barangay-info';
import { prisma } from './db';

const settings = (o: Record<string, string>) =>
  (prisma.systemSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
    Object.entries(o).map(([key, value]) => ({ key, value }))
  );

describe('getBarangayInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the barangay details from General Settings', async () => {
    settings({ barangay_name: ' Barangay Sample ', city: 'Sample City', province: 'Sample Province', region: 'Region X' });
    expect(await getBarangayInfo()).toEqual({
      name: 'Barangay Sample',
      city: 'Sample City',
      province: 'Sample Province',
      region: 'Region X',
    });
  });

  it('returns blanks (never another barangay\'s name) when nothing is configured', async () => {
    settings({});
    expect(await getBarangayInfo()).toEqual({ name: '', city: '', province: '', region: '' });
  });
});

describe('getActiveCaptain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefers the General Settings signatory override without touching Officials', async () => {
    settings({ captain_override_name: 'Ana B. Reyes', captain_override_position: 'OIC Punong Barangay' });
    expect(await getActiveCaptain()).toEqual({ name: 'Ana B. Reyes', position: 'OIC Punong Barangay', term: '' });
    expect(prisma.brgyOfficial.findFirst).not.toHaveBeenCalled();
  });

  it('defaults the override position to Punong Barangay', async () => {
    settings({ captain_override_name: 'Ana Reyes' });
    expect((await getActiveCaptain()).position).toBe('Punong Barangay');
  });

  it('falls back to the active Punong Barangay in the Officials table', async () => {
    settings({});
    (prisma.brgyOfficial.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      position: 'Punong Barangay',
      term_start: new Date('2023-11-01'),
      term_end: new Date('2026-10-30'),
      resident: { fname: 'Juan', mname: 'Dizon', lname: 'Dela Cruz', name_extension: 'Jr.' },
    });
    expect(await getActiveCaptain()).toEqual({
      name: 'Juan D. Dela Cruz Jr.',
      position: 'Punong Barangay',
      term: '2023–2026',
    });
    expect(prisma.brgyOfficial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: true }) })
    );
  });

  it('returns a blank signatory when there is no override and no active captain', async () => {
    settings({});
    (prisma.brgyOfficial.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getActiveCaptain()).toEqual({ name: '', position: 'Punong Barangay', term: '' });
  });
});