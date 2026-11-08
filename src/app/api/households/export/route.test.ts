// FILE: src/app/api/households/export/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/session';

vi.mock('@/lib/db', () => ({
  prisma: { household: { count: vi.fn(), findMany: vi.fn() }, purok: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/session', () => ({ requirePermission: vi.fn() }));
vi.mock('@/lib/barangay-info', () => ({ getBarangayInfo: vi.fn().mockResolvedValue({ name: 'Quisol' }) }));

const person = (id: number, fname: string, lname: string) => ({
  id, fname, lname, mname: 'Cruz', name_extension: null, birthdate: new Date('1980-05-10'), sex: 'FEMALE', civil_status: 'MARRIED',
});
const household = {
  household_no: 'HHNP100000007',
  address: 'Sitio Bukid',
  purok: { name: 'Purok V' },
  household_head_id: 2,
  household_head: person(2, 'Ana', 'Reyes'),
  members: [person(3, 'Ben', 'Reyes'), person(2, 'Ana', 'Reyes')],
  no_of_families: 1,
  housing_type: 'OTHER', housing_type_other: 'Bamboo house',
  tenure_status: 'OWNER', tenure_other: null,
  household_unit: 'SINGLE_HOUSE', household_unit_other: null,
  water_source: 'COMMUNAL', waste_disposal: 'COLLECTED', power_supply: 'ELECTRIC_METERED', comfort_room: 'OWN',
  monthly_income: 12500,
  created_at: new Date('2025-02-01T00:00:00Z'),
};

async function readBook(res: Response) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()) as any);
  return wb;
}

describe('GET /api/households/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as any).mockResolvedValue({ session: { user: { id: '1', username: 'admin', role: 'ADMIN' } } });
    (prisma.household.count as any).mockResolvedValue(1);
    (prisma.household.findMany as any).mockResolvedValue([household]);
    (prisma.purok.findUnique as any).mockResolvedValue({ name: 'Purok V' });
  });

  it('requires residents:export, like the Residents export', async () => {
    (requirePermission as any).mockResolvedValue({ error: 'Forbidden', status: 403 });
    const res = await GET(new NextRequest('http://localhost/api/households/export'));
    expect(res.status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith('residents:export', expect.anything());
    expect(prisma.household.findMany).not.toHaveBeenCalled();
  });

  it('returns an .xlsx named by date, filtered like the list', async () => {
    const res = await GET(new NextRequest('http://localhost/api/households/export?purok_id=5&search=reyes'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml');
    expect(res.headers.get('Content-Disposition')).toMatch(/households-\d{4}-\d{2}-\d{2}\.xlsx/);
    const where = (prisma.household.findMany as any).mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({ purok_id: 5 });
    expect(JSON.stringify(where.AND[1])).toContain('reyes');
  });

  it('writes households in words and lists members with the head first', async () => {
    const wb = await readBook(await GET(new NextRequest('http://localhost/api/households/export')));
    const hh = wb.getWorksheet('Households')!;
    expect(hh.getCell('A1').value).toBe('Barangay Quisol — Households');
    expect(hh.getRow(3).getCell(1).value).toBe('Household no.');
    const row = hh.getRow(4);
    expect(row.getCell(1).value).toBe('HHNP100000007');
    expect(row.getCell(2).value).toBe('Reyes, Ana C.');
    expect(row.getCell(5).value).toBe(2);
    expect(row.getCell(7).value).toBe('Bamboo house');
    expect(row.getCell(12).value).toBe('Electric (metered)');
    expect(row.getCell(14).value).toBe(12500);

    const members = wb.getWorksheet('Members')!;
    expect(members.getRow(4).getCell(2).value).toBe('Reyes, Ana C.');
    expect(members.getRow(4).getCell(3).value).toBe('Household head');
    expect(members.getRow(5).getCell(3).value).toBe('Member');
  });

  it('records the export in the audit log', async () => {
    await GET(new NextRequest('http://localhost/api/households/export?purok_id=5'));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPORT', table_affected: 'Household', details: expect.stringContaining('Purok V') })
    );
  });

  it('refuses an invalid purok', async () => {
    const res = await GET(new NextRequest('http://localhost/api/households/export?purok_id=abc'));
    expect(res.status).toBe(400);
  });

  it('returns a PDF when asked, and logs it as a PDF export', async () => {
    const res = await GET(new NextRequest('http://localhost/api/households/export?format=pdf'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toMatch(/households-\d{4}-\d{2}-\d{2}\.pdf/);
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect((logAudit as any).mock.calls[0][0].details).toContain('to PDF');
  });
});