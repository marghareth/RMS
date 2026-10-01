// FILE: src/app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { describeDbError } from "@/lib/db-errors";

export default async function RootPage() {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    // getSession() verifies the account against the database, so if the
    // database can't be reached we can't tell who this is. Show a readable
    // message instead of a raw 500 + stack trace. (redirect() below must
    // stay outside this try/catch — it works by throwing.)
    console.warn("[RootPage] could not verify session:", describeDbError(err));
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#E9EAEC] bg-white p-8 text-center shadow-sm">
          <h1 className="text-[18px] font-black uppercase tracking-wide text-[#1F2937]">
            Can&apos;t reach the database
          </h1>
          <p className="mt-3 text-[13px] text-[#6B7280]">
            The system couldn&apos;t connect to its database, so it can&apos;t sign you in right now.
            Check your internet connection and try again. If it keeps happening, tell your system
            administrator.
          </p>
          {/* Plain <a>, not <Link>: we want a full reload, not a cached client navigation. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="mt-6 inline-flex rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB]"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  // No session -> straight to /login in one hop (instead of bouncing
  // through /dashboard and letting middleware redirect it there).
  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}