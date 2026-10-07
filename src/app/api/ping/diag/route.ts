// TEMPORARY DIAGNOSTIC — delete this file once login works on Vercel.
// Public on purpose (lives under /api/ping, which middleware exempts).
// Returns only booleans / non-secret facts; never secrets or password hashes.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function redact(msg: string) {
  return msg
    .replace(/`[^`]*`/g, "`<redacted>`")
    .replace(/\b[\w.-]+\.(supabase\.com|supabase\.co)\b/g, "<host>")
    .slice(0, 300);
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  let port: string | null = null;
  let params: Record<string, string> = {};
  try {
    const u = new URL(dbUrl);
    port = u.port || "5432";
    params = Object.fromEntries(u.searchParams.entries());
  } catch {
    /* unparsable */
  }

  const out: Record<string, unknown> = {
    env: {
      NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
      MFA_ENFORCEMENT: process.env.MFA_ENFORCEMENT ?? "(not set → defaults to ON)",
      DATABASE_URL_set: !!dbUrl,
      DATABASE_URL_parsable: port !== null,
      DATABASE_URL_port: port,
      DATABASE_URL_pgbouncer: params.pgbouncer ?? "(missing)",
      DATABASE_URL_connection_limit: params.connection_limit ?? "(missing)",
      VERCEL_REGION: process.env.VERCEL_REGION ?? "(local)",
    },
  };

  const t = Date.now();
  try {
    const users = await prisma.user.count();
    const admin = await prisma.user.findUnique({
      where: { username: "admin" },
      select: { is_active: true, role: true, mfa_enabled: true },
    });
    out.db = { ok: true, ms: Date.now() - t, user_count: users, admin_found: !!admin, admin };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    out.db = { ok: false, ms: Date.now() - t, code: err.code ?? null, message: redact(err.message ?? String(e)) };
  }

  return NextResponse.json(out);
}