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
describe('splitPassword / redactCredentials', () => {
  it('moves the password out of the connection URL', async () => {
    const { splitPassword } = await import('./backup');
    const { url, password } = splitPassword('postgresql://rms:s3cr%40t@db.example.com:6543/postgres?pgbouncer=true');
    expect(password).toBe('s3cr@t');
    expect(url).toBe('postgresql://rms@db.example.com:6543/postgres?pgbouncer=true');
  });

  it('masks credentials in an error message', async () => {
    const { redactCredentials } = await import('./backup');
    const msg = 'Command failed: pg_dump postgresql://rms:hunter2@db.example.com/postgres -F p';
    expect(redactCredentials(msg)).toBe('Command failed: pg_dump postgresql://rms:***@db.example.com/postgres -F p');
  });
});
