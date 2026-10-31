// FILE: src/lib/backup-snapshot.test.ts
import { describe, it, expect, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  BackupError,
  decodeSnapshot,
  delegateName,
  encodeSnapshot,
  exportSnapshot,
  planRestore,
  totalRows,
  type FieldMeta,
  type ModelMeta,
} from './backup-snapshot';

const id: FieldMeta = { name: 'id', kind: 'scalar', type: 'Int', isList: false, isRequired: true, isId: true };
const scalar = (name: string): FieldMeta => ({ name, kind: 'scalar', type: 'String', isList: false, isRequired: true });
const rel = (name: string, type: string, fk: string, required: boolean): FieldMeta => ({
  name,
  kind: 'object',
  type,
  isList: false,
  isRequired: required,
  relationFromFields: [fk],
});
const back = (name: string, type: string): FieldMeta => ({ name, kind: 'object', type, isList: true, isRequired: true, relationFromFields: [] });

// A cut-down copy of the real schema's tricky part: Household and Resident
// point at each other (household_head_id / household_id), both optional.
const MODELS: ModelMeta[] = [
  { name: 'User', fields: [id, scalar('username'), back('audit_logs', 'AuditLog')] },
  { name: 'Purok', fields: [id, scalar('name')] },
  {
    name: 'Household',
    fields: [id, rel('purok', 'Purok', 'purok_id', true), rel('household_head', 'Resident', 'household_head_id', false), back('members', 'Resident')],
  },
  {
    name: 'Resident',
    fields: [id, rel('household', 'Household', 'household_id', false), rel('purok', 'Purok', 'purok_id', false)],
  },
  { name: 'Certificate', fields: [id, rel('resident', 'Resident', 'resident_id', false), rel('issuer', 'User', 'issued_by', true)] },
  { name: 'AuditLog', fields: [id, rel('user', 'User', 'user_id', true)] },
];

describe('delegateName', () => {
  it('lower-cases only the first letter, like the Prisma client', () => {
    expect(delegateName('BrgyOfficial')).toBe('brgyOfficial');
    expect(delegateName('AuditLog')).toBe('auditLog');
  });
});

describe('planRestore', () => {
  it('orders every model after the models its required foreign keys point to', () => {
    const { order } = planRestore(MODELS);
    const pos = (n: string) => order.indexOf(n);
    expect(order).toHaveLength(MODELS.length);
    expect(pos('Purok')).toBeLessThan(pos('Household'));
    expect(pos('User')).toBeLessThan(pos('Certificate'));
    expect(pos('User')).toBeLessThan(pos('AuditLog'));
  });

  it('defers the optional foreign key that would point forward (Household → Resident)', () => {
    const { order, deferred } = planRestore(MODELS);
    expect(order.indexOf('Household')).toBeLessThan(order.indexOf('Resident'));
    expect(deferred).toEqual({ Household: ['household_head_id'] });
  });

  it('keeps the schema order when nothing forces a change', () => {
    expect(planRestore(MODELS).order).toEqual(['User', 'Purok', 'Household', 'Resident', 'Certificate', 'AuditLog']);
  });

  it('reorders when a model is declared before something it requires', () => {
    const models: ModelMeta[] = [
      { name: 'Child', fields: [id, rel('parent', 'Parent', 'parent_id', true)] },
      { name: 'Parent', fields: [id] },
    ];
    expect(planRestore(models).order).toEqual(['Parent', 'Child']);
  });

  it('fails clearly on a cycle of required foreign keys', () => {
    const models: ModelMeta[] = [
      { name: 'A', fields: [id, rel('b', 'B', 'b_id', true)] },
      { name: 'B', fields: [id, rel('a', 'A', 'a_id', true)] },
    ];
    expect(() => planRestore(models)).toThrow(/cycle/);
  });
});

describe('exportSnapshot', () => {
  function fakeDelegate(rows: { id: number }[]) {
    return {
      findMany: vi.fn(async (args: { take: number; cursor?: { id: number }; skip?: number }) => {
        const start = args.cursor ? rows.findIndex((r) => r.id === args.cursor!.id) + (args.skip ?? 0) : 0;
        return rows.slice(start, start + args.take);
      }),
    };
  }

  it('reads every row of every model, a page at a time', async () => {
    const users = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const puroks = [{ id: 1 }];
    const client = { user: fakeDelegate(users), purok: fakeDelegate(puroks) };
    const snap = await exportSnapshot(client, MODELS.slice(0, 2), 2);

    expect(snap.models.User).toEqual(users);
    expect(snap.models.Purok).toEqual(puroks);
    expect(snap.counts).toEqual({ User: 5, Purok: 1 });
    // 5 rows with page size 2 → pages of 2, 2, 1.
    expect(client.user.findMany).toHaveBeenCalledTimes(3);
    expect(client.user.findMany.mock.calls[1][0]).toMatchObject({ skip: 1, cursor: { id: 2 }, orderBy: { id: 'asc' } });
  });

  it('fails clearly when the client is missing a model', async () => {
    await expect(exportSnapshot({}, MODELS.slice(0, 1))).rejects.toThrow(BackupError);
  });
});

describe('encodeSnapshot / decodeSnapshot', () => {
  const snap = {
    format: 'brgy-rms-snapshot' as const,
    version: 1,
    created_at: '2026-10-31T08:00:00.000Z',
    counts: { User: 1, Purok: 2 },
    models: { User: [{ id: 1, username: 'admin' }], Purok: [{ id: 1 }, { id: 2 }] },
  };

  it('round-trips a snapshot through gzip', () => {
    const bytes = encodeSnapshot(snap);
    expect(bytes[0]).toBe(0x1f); // gzip magic number
    expect(decodeSnapshot(bytes)).toEqual(snap);
    expect(totalRows(snap)).toBe(3);
  });

  it('turns Dates into ISO strings, which Prisma accepts back on restore', () => {
    const withDate = { ...snap, models: { User: [{ id: 1, created_at: new Date('2026-01-02T03:04:05.000Z') }] } };
    const decoded = decodeSnapshot(encodeSnapshot(withDate as never));
    expect(decoded.models.User[0].created_at).toBe('2026-01-02T03:04:05.000Z');
  });

  it('rejects files that are not RMS snapshots', () => {
    expect(() => decodeSnapshot(Buffer.from('plain text'))).toThrow(/gzipped JSON/);
    expect(() => decodeSnapshot(gzipSync(JSON.stringify({ hello: 1 })))).toThrow(/isn't an RMS backup/);
    expect(() => decodeSnapshot(gzipSync(JSON.stringify({ ...snap, version: 99 })))).toThrow(/Unsupported backup version/);
  });
});