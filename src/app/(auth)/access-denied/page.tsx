import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E9EAEC] bg-white p-8 text-center shadow-sm">
        <h1 className="text-[18px] font-black uppercase tracking-wide text-[#1F2937]">Access Denied</h1>
        <p className="mt-3 text-[13px] text-[#6B7280]">
          You do not have permission to view this page. Please contact an administrator if you believe this is a mistake.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
