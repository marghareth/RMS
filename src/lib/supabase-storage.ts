// FILE: src/lib/supabase-storage.ts
//
// Minimal Supabase Storage client for backup files, using the Storage REST
// API directly with `fetch` — no extra npm dependency needed.
//
// SETUP (once):
//   1. Supabase dashboard → Storage → New bucket. Name it "backups" (or set
//      BACKUP_BUCKET), and leave "Public bucket" OFF. Backups hold the whole
//      database, so the bucket must be private.
//   2. Supabase dashboard → Project Settings → API. Copy the Project URL and
//      the service_role key.
//   3. In Vercel → Project → Settings → Environment Variables, add:
//        SUPABASE_URL=https://<project-ref>.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<service_role key>
//        BACKUP_BUCKET=backups            (optional, this is the default)
//      SUPABASE_SERVICE_ROLE_KEY bypasses all Supabase security rules: it
//      must only ever exist on the server. Never prefix it with NEXT_PUBLIC_.
//
// Only server code imports this file (the backup API routes).

export class SupabaseStorageError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface SupabaseStorageConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}

/** Reads the config from the environment; null when Supabase Storage isn't set up. */
export function getSupabaseStorageConfig(env: Record<string, string | undefined> = process.env): SupabaseStorageConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return {
    url: url.replace(/\/+$/, ""),
    serviceKey,
    bucket: env.BACKUP_BUCKET?.trim() || "backups",
  };
}

/** Encodes each path segment but keeps the slashes between them. */
function encodeObjectPath(objectPath: string): string {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function authHeaders(cfg: SupabaseStorageConfig): Record<string, string> {
  return { Authorization: `Bearer ${cfg.serviceKey}`, apikey: cfg.serviceKey };
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as { message?: string; error?: string };
      return json.message || json.error || body;
    } catch {
      return body;
    }
  } catch {
    return "";
  }
}

/** Uploads a new object. Fails rather than overwriting if the path already exists. */
export async function uploadObject(
  cfg: SupabaseStorageConfig,
  objectPath: string,
  body: Uint8Array,
  contentType: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl(`${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: { ...authHeaders(cfg), "Content-Type": contentType, "x-upsert": "false" },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) {
    const detail = (await errorText(res)).slice(0, 300);
    const hint = /bucket not found/i.test(detail)
      ? ` Create a private bucket named "${cfg.bucket}" in Supabase → Storage, or set BACKUP_BUCKET.`
      : res.status === 401 || res.status === 403
      ? " Check that SUPABASE_SERVICE_ROLE_KEY is the service_role key (not the anon key)."
      : "";
    throw new SupabaseStorageError(`Upload to Supabase Storage failed (HTTP ${res.status}): ${detail}${hint}`, res.status);
  }
}

/** Downloads an object from a private bucket. */
export async function downloadObject(
  cfg: SupabaseStorageConfig,
  objectPath: string,
  fetchImpl: typeof fetch = fetch,
  bucket: string = cfg.bucket
): Promise<Buffer> {
  const res = await fetchImpl(
    `${cfg.url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    { method: "GET", headers: authHeaders(cfg) }
  );
  if (!res.ok) {
    const detail = (await errorText(res)).slice(0, 300);
    throw new SupabaseStorageError(`Download from Supabase Storage failed (HTTP ${res.status}): ${detail}`, res.status);
  }
  return Buffer.from(await res.arrayBuffer());
}