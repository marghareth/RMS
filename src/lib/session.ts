import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./auth";
import { hasPermission } from "./permission";

export async function getSession() {
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
  permission: Parameters<typeof hasPermission>[1]
) {
  const session = await getSession();
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