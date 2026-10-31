// FILE: src/lib/supabase-storage.test.ts
import { describe, it, expect, vi } from 'vitest';
import { downloadObject, getSupabaseStorageConfig, SupabaseStorageError, uploadObject } from './supabase-storage';

const CFG = { url: 'https://abc.supabase.co', serviceKey: 'service-key', bucket: 'backups' };

function response(status: number, body: string | Uint8Array = '') {
  return new Response(body as BodyInit, { status });
}

describe('getSupabaseStorageConfig', () => {
  it('is null until both the URL and the service key are set', () => {
    expect(getSupabaseStorageConfig({})).toBeNull();
    expect(getSupabaseStorageConfig({ SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull();
  });

  it('trims a trailing slash and defaults the bucket to "backups"', () => {
    expect(
      getSupabaseStorageConfig({ SUPABASE_URL: 'https://abc.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'k' })
    ).toEqual({ url: 'https://abc.supabase.co', serviceKey: 'k', bucket: 'backups' });
  });

  it('uses BACKUP_BUCKET when set', () => {
    const cfg = getSupabaseStorageConfig({
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      BACKUP_BUCKET: 'rms-backups',
    });
    expect(cfg?.bucket).toBe('rms-backups');
  });
});

describe('uploadObject', () => {
  it('POSTs to the bucket with the service key and refuses to overwrite', async () => {
    const fetchImpl = vi.fn(async () => response(200, '{"Key":"backups/2026/x.json.gz"}'));
    await uploadObject(CFG, '2026/x.json.gz', new Uint8Array([1, 2, 3]), 'application/gzip', fetchImpl as unknown as typeof fetch);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/backups/2026/x.json.gz');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer service-key',
      apikey: 'service-key',
      'Content-Type': 'application/gzip',
      'x-upsert': 'false',
    });
  });

  it('explains a missing bucket', async () => {
    const fetchImpl = vi.fn(async () => response(404, '{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}'));
    await expect(
      uploadObject(CFG, 'x.json.gz', new Uint8Array(), 'application/gzip', fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow(/Create a private bucket named "backups"/);
  });

  it('points at the key when Supabase rejects the credentials', async () => {
    const fetchImpl = vi.fn(async () => response(403, '{"message":"new row violates row-level security policy"}'));
    const err = await uploadObject(CFG, 'x', new Uint8Array(), 'application/gzip', fetchImpl as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(SupabaseStorageError);
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/service_role key/);
  });
});

describe('downloadObject', () => {
  it('GETs the object from the authenticated endpoint', async () => {
    const fetchImpl = vi.fn(async () => response(200, new Uint8Array([9, 8, 7])));
    const body = await downloadObject(CFG, '2026/x.json.gz', fetchImpl as unknown as typeof fetch);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/authenticated/backups/2026/x.json.gz');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer service-key' });
    expect([...body]).toEqual([9, 8, 7]);
  });

  it('can read from the bucket recorded on an older backup', async () => {
    const fetchImpl = vi.fn(async () => response(200, 'x'));
    await downloadObject(CFG, 'a.json.gz', fetchImpl as unknown as typeof fetch, 'old-bucket');
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain('/authenticated/old-bucket/a.json.gz');
  });

  it('reports the HTTP status on failure', async () => {
    const fetchImpl = vi.fn(async () => response(400, '{"error":"not_found","message":"Object not found"}'));
    const err = await downloadObject(CFG, 'gone', fetchImpl as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(SupabaseStorageError);
    expect(err.message).toMatch(/Object not found/);
  });
});