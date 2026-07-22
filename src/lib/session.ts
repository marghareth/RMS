import { getServerSession, type Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "./auth";
import { hasPermission } from "./permission";

export async function getSession(req?: NextRequest) {
  if (req) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) return null;
    return {
      user: {
        id: String(token.id),
        username: token.username as string,
        role: token.role as string,
      },
      expires: new Date((token.exp as number) * 1000).toISOString(),
    } as Session;
  }

  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  return { session };
}

export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
  req?: NextRequest
) {
  const session = await getSession(req);
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }

  const userWithRole = session.user as (Session["user"] & { role?: string }) | undefined;
  const role = userWithRole?.role;

  if (!role || !hasPermission(role, permission)) {
    return { error: "Forbidden", status: 403 };
  }

  return { session };
}