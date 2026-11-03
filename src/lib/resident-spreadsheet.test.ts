// FILE: src/lib/resident-spreadsheet.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildImportTemplate, buildResidentExport, type ExportResident } from './resident-spreadsheet';
import { parseImportFile, validateImportRow } from './residentImport';
import { lookupKey } from './import-normalize';

const resident: ExportResident = {
  fname: 'Maria', lname: 'Santos', mname: 'Reyes', name_extension: null,
  birthdate: new Date('1985-07-04T00:00:00Z'), sex: 'FEMALE', civil_status: 'LIVE_IN',
  place_of_birth: 'Tacloban City', religion: null, employment_status: 'Employed',
  educational_attainment: null, occupation: 'Teacher', income_bracket: null,
  mobile: '09171234567', email: null, purok: { name: 'Purok 2' }, household: { household_no: 'HH-0007' },
};

async function load(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

describe('buildImportTemplate', () => {
  it('has a titled Residents sheet first, headings on row 3 with required ones marked *, and Instructions', async () => {
    const wb = await load(await buildImportTemplate({ barangay: 'San Jose', puroks: ['Purok 1', 'Purok 2'] }));
    const ws = wb.worksheets[0];
    expect(ws.name).toBe('Residents');
    expect(ws.getCell('A1').value).toBe('Barangay San Jose — Residents');
    expect(ws.getCell('A3').value).toBe('First Name *');
    expect(ws.getCell('C3').value).toBe('Middle Name');
    expect(wb.getWorksheet('Instructions')).toBeDefined();
  });

  it("gives Sex, Civil Status and Purok dropdowns, and keeps Mobile No. as text", async () => {
    const ws = (await load(await buildImportTemplate({ barangay: '', puroks: ['Purok 1'] }))).worksheets[0];
    expect(ws.getCell('F4').dataValidation?.type).toBe('list'); // Sex
    expect(ws.getCell('G4').dataValidation?.type).toBe('list'); // Civil Status
    expect(ws.getCell('H4').dataValidation?.type).toBe('list'); // Purok
    expect(ws.getCell('P4').numFmt).toBe('@'); // Mobile
  });

  it('imports as an empty file (no data rows), not as garbage', async () => {
    expect(parseImportFile(await buildImportTemplate({ barangay: '', puroks: [] }), 't.xlsx')).toEqual([]);
  });
});

describe('buildResidentExport', () => {
  it('can be imported again exactly as exported', async () => {
    const buf = await buildResidentExport({ barangay: 'San Jose', residents: [resident], note: '1 resident' });
    const rows = parseImportFile(buf, 'residents.xlsx');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fname: 'Maria', lname: 'Santos', birthdate: '1985-07-04', sex: 'Female',
      civil_status: 'Live-in', purok_name: 'Purok 2', household_no: 'HH-0007', mobile: '09171234567',
    });

    const result = validateImportRow(1, rows[0], {
      puroksByName: new Map([[lookupKey('Purok 2'), 2]]),
      householdsByNo: new Map([[lookupKey('HH-0007'), { id: 7, purok_id: 2 }]]),
    });
    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({ sex: 'FEMALE', civil_status: 'LIVE_IN', household_id: 7, purok_id: 2 });
    expect(result.data?.birthdate.toISOString().slice(0, 10)).toBe('1985-07-04');
  });
});