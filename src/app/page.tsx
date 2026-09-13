// FILE: src/app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function RootPage() {
  const session = await getSession();

  // No session -> straight to /login in one hop (instead of bouncing
  // through /dashboard and letting middleware redirect it there).
  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}