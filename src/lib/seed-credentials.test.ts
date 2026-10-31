// FILE: src/lib/seed-credentials.test.ts
import { describe, it, expect } from 'vitest';
import {
  LEGACY_SEED_PASSWORDS,
  checkSeedTarget,
  generateStrongPassword,
  isLocalDatabaseUrl,
  demoPasswordsEnabled,
  weakPasswordCandidates,
} from './seed-credentials';

const LOCAL = 'postgresql://postgres:postgres@localhost:5432/brgy_rms';
const SUPABASE = 'postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

describe('weakPasswordCandidates', () => {
  it('includes every password the old seed created', () => {
    const c = weakPasswordCandidates('someone');
    for (const pw of Object.values(LEGACY_SEED_PASSWORDS)) expect(c).toContain(pw);
  });

  it('covers the "<name without digits>123" pattern the old seed used for kagawad1', () => {
    expect(weakPasswordCandidates('kagawad1')).toContain('kagawad123');
    expect(weakPasswordCandidates('tanod7')).toContain('tanod123');
  });

  it('includes the username itself and common weak passwords', () => {
    const c = weakPasswordCandidates('maria');
    expect(c).toEqual(expect.arrayContaining(['maria', 'maria123', 'password', 'barangay123']));
  });

  it('never contains duplicates or an empty string', () => {
    const c = weakPasswordCandidates('123');
    expect(new Set(c).size).toBe(c.length);
    expect(c).not.toContain('');
  });
});

describe('generateStrongPassword', () => {
  it('produces four groups of four characters', () => {
    expect(generateStrongPassword()).toMatch(/^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);
  });

  it('avoids look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(generateStrongPassword()).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateStrongPassword()));
    expect(seen.size).toBe(500);
  });

  it('is never one of the weak candidates', () => {
    const pw = generateStrongPassword();
    expect(weakPasswordCandidates('admin')).not.toContain(pw);
  });
});

describe('isLocalDatabaseUrl', () => {
  it('accepts localhost and loopback addresses', () => {
    expect(isLocalDatabaseUrl(LOCAL)).toBe(true);
    expect(isLocalDatabaseUrl('postgresql://u:p@127.0.0.1/x')).toBe(true);
  });

  it('rejects a Supabase URL, an empty value and garbage', () => {
    expect(isLocalDatabaseUrl(SUPABASE)).toBe(false);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
    expect(isLocalDatabaseUrl('not a url')).toBe(false);
  });
});

describe('checkSeedTarget', () => {
  it('allows a local database', () => {
    expect(checkSeedTarget({ DATABASE_URL: LOCAL }).allowed).toBe(true);
  });

  it('refuses a remote (Supabase) database', () => {
    const r = checkSeedTarget({ DATABASE_URL: SUPABASE });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/local database/);
  });

  it('refuses when NODE_ENV is production, even with a local URL', () => {
    expect(checkSeedTarget({ DATABASE_URL: LOCAL, NODE_ENV: 'production' }).allowed).toBe(false);
  });

  it('can be overridden on purpose with ALLOW_REMOTE_SEED=1', () => {
    expect(checkSeedTarget({ DATABASE_URL: SUPABASE, ALLOW_REMOTE_SEED: '1' }).allowed).toBe(true);
  });
});

describe('demoPasswordsEnabled', () => {
  it('is on only when asked for AND the database is local', () => {
    expect(demoPasswordsEnabled({ SEED_DEMO_PASSWORDS: '1', DATABASE_URL: LOCAL })).toBe(true);
    expect(demoPasswordsEnabled({ DATABASE_URL: LOCAL })).toBe(false);
  });

  it('can never be turned on for a remote database or in production', () => {
    expect(demoPasswordsEnabled({ SEED_DEMO_PASSWORDS: '1', DATABASE_URL: SUPABASE, ALLOW_REMOTE_SEED: '1' })).toBe(false);
    expect(demoPasswordsEnabled({ SEED_DEMO_PASSWORDS: '1', DATABASE_URL: LOCAL, NODE_ENV: 'production' })).toBe(false);
  });
});