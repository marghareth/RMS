// FILE: src/app/api/branding/logo/route.ts
//
// The barangay logo uploaded in General Settings → Barangay Logo, served as
// an image so the sidebar and the login page can show it with a plain
// <img src="/api/branding/logo">. 404 when none has been uploaded (the
// page then shows its built-in mark).
//
// No sign-in required: the login page needs it, and the seal is public
// anyway (it's printed on every certificate). Only this one setting is
// exposed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.systemSetting.findUnique({ where: { key: "logo_barangay" } }).catch(() => null);
  const m = /^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/=]+)$/.exec(row?.value ?? "");
  if (!m) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: {
      "Content-Type": m[1] === "image/jpg" ? "image/jpeg" : m[1],
      // Short cache; a new upload also changes the ?v= the pages ask for.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}