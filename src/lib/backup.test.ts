// FILE: src/lib/backup.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

describe('resolveBackupPath', () => {
  const ORIGINAL_ENV = process.env.BACKUP_DIR;

  beforeEach(() => {
    process.env.BACKUP_DIR = '/tmp/rms-backups-test';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.BACKUP_DIR = ORIGINAL_ENV;
  });

  it('resolves a plain filename inside BACKUP_DIR', async () => {
    const { resolveBackupPath } = await import('./backup');
    const resolved = resolveBackupPath('backup-2026-01-01.sql');
    expect(resolved).toBe(path.resolve('/tmp/rms-backups-test', 'backup-2026-01-01.sql'));
  });

  it('rejects a path-traversal attempt (../)', async () => {
    const { resolveBackupPath, BackupError } = await import('./backup');
    expect(() => resolveBackupPath('../../etc/passwd')).toThrow(BackupError);
  });

  it('rejects an absolute path pointing outside BACKUP_DIR', async () => {
    const { resolveBackupPath, BackupError } = await import('./backup');
    expect(() => resolveBackupPath('/etc/passwd')).toThrow(BackupError);
  });

  it('rejects a sibling-directory escape disguised with a shared prefix', async () => {
    // "/tmp/rms-backups-test-evil/x" shares the string prefix
    // "/tmp/rms-backups-test" but is NOT inside it — a naive
    // `startsWith(BACKUP_DIR)` check (without the path.sep) would wrongly
    // allow this.
    const { resolveBackupPath, BackupError } = await import('./backup');
    expect(() => resolveBackupPath('../rms-backups-test-evil/x')).toThrow(BackupError);
  });

  it('allows a subdirectory path (no traversal) since it is still contained', async () => {
    const { resolveBackupPath } = await import('./backup');
    const resolved = resolveBackupPath('nested/backup.sql');
    expect(resolved).toBe(path.resolve('/tmp/rms-backups-test', 'nested', 'backup.sql'));
  });
});
describe('parseFileReference', () => {
  it('reads a Supabase Storage reference', async () => {
    const { parseFileReference } = await import('./backup');
    expect(parseFileReference('supabase:backups/2026/backup-2026-10-31T08-00-00-000Z.json.gz')).toEqual({
      kind: 'supabase',
      bucket: 'backups',
      objectPath: '2026/backup-2026-10-31T08-00-00-000Z.json.gz',
      filename: 'backup-2026-10-31T08-00-00-000Z.json.gz',
    });
  });

  it('treats an older plain file name as a local file', async () => {
    const { parseFileReference } = await import('./backup');
    expect(parseFileReference('backup-2026-01-01.sql')).toEqual({
      kind: 'local',
      relativePath: 'backup-2026-01-01.sql',
      filename: 'backup-2026-01-01.sql',
    });
  });

  it('rejects malformed or traversing Supabase references', async () => {
    const { parseFileReference, BackupError } = await import('./backup');
    expect(() => parseFileReference('supabase:')).toThrow(BackupError);
    expect(() => parseFileReference('supabase:backups')).toThrow(BackupError);
    expect(() => parseFileReference('supabase:backups/')).toThrow(BackupError);
    expect(() => parseFileReference('supabase:backups/../secret.json')).toThrow(BackupError);
  });
});

describe('resolveBackupDestination', () => {
  const SUPA = { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'key' };

  it('uses Supabase Storage when it is configured', async () => {
    const { resolveBackupDestination } = await import('./backup');
    expect(resolveBackupDestination(SUPA)).toBe('supabase');
  });

  it('falls back to local disk when Supabase Storage is not configured', async () => {
    const { resolveBackupDestination } = await import('./backup');
    expect(resolveBackupDestination({})).toBe('local');
  });

  it('respects an explicit BACKUP_STORAGE choice', async () => {
    const { resolveBackupDestination } = await import('./backup');
    expect(resolveBackupDestination({ ...SUPA, BACKUP_STORAGE: 'local' })).toBe('local');
    expect(resolveBackupDestination({ BACKUP_STORAGE: 'Supabase' })).toBe('supabase');
  });

  it('rejects an unknown BACKUP_STORAGE value', async () => {
    const { resolveBackupDestination, BackupError } = await import('./backup');
    expect(() => resolveBackupDestination({ BACKUP_STORAGE: 's3' })).toThrow(BackupError);
  });
});

describe('runDatabaseBackup on Vercel without Supabase Storage', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses the local pg_dump path with a clear message instead of failing obscurely', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.BACKUP_STORAGE;
    process.env.VERCEL = '1';
    const { runDatabaseBackup } = await import('./backup');
    await expect(runDatabaseBackup()).rejects.toThrow(/can't run on Vercel/);
  });
});