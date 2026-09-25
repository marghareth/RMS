// FILE: src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// Small reusable brand mark — same house/flag glyph used in the sidebar
// header (src/components/layout/Sidebar.tsx) so the login screen reads
// as the same product rather than a different login vendor bolted on.
// Declared at module scope (not inside LoginPage) — a component defined
// during render gets torn down and recreated on every re-render, which
// resets any state/DOM it owns. This one is stateless today, but the
// lint rule (react-hooks/static-components) flags the pattern itself
// since it silently breaks the moment the component gains state.
function BrandMark({ className = "h-6 w-6", fill = "#3B82F6" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2.6 20.2 8v1.5H3.8V8L12 2.6Z" fill={fill} />
      <rect x="5.4" y="10.6" width="2.3" height="7.4" fill={fill} />
      <rect x="10.85" y="10.6" width="2.3" height="7.4" fill={fill} />
      <rect x="16.3" y="10.6" width="2.3" height="7.4" fill={fill} />
      <rect x="3.4" y="19.2" width="17.2" height="2.2" rx="1" fill={fill} />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once a username/password check comes back needing a second factor,
  // we swap to this step rather than a full separate page — same form,
  // same session of intent, just one more field.
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [totp, setTotp] = useState("");

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res;
    try {
      res = await signIn("credentials", { username, password, redirect: false });
    } catch {
      // signIn() rejecting (network failure, blocked request, etc.) used to
      // leave the button stuck on "Signing in..." forever since nothing
      // downstream ever ran. Surface it as a normal error instead.
      setError("Couldn't reach the server. Please check your connection and try again.");
      setLoading(false);
      return;
    }

    if (res?.ok) {
      router.push("/dashboard");
      return;
    }

    if (res?.error === "MFA_REQUIRED") {
      setStep("totp");
      setLoading(false);
      return;
    }

    setError("Invalid username or password.");
    setLoading(false);
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res;
    try {
      res = await signIn("credentials", { username, password, totp, redirect: false });
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      setLoading(false);
      return;
    }

    if (res?.ok) {
      router.push("/dashboard");
      return;
    }

    setError(
      res?.error === "MFA_INVALID"
        ? "That code didn't work. Check your app or try a backup code."
        : "Something went wrong. Try again."
    );
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0A0A0A]">
      {/* ── Brand panel — hidden below lg, matches the sidebar's blue accent ── */}
      <div className="relative hidden w-[44%] shrink-0 overflow-hidden bg-linear-to-br from-[#3B82F6] via-[#2563EB] to-[#12151C] lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* decorative glow — same blue family as the gradient, no new hues */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#12151C]/50 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <BrandMark className="h-7 w-7 shrink-0" fill="#FFFFFF" />
          <b className="block text-[15px] font-semibold leading-tight text-white">
            Barangay Records Management System
          </b>
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            You can easily
          </p>
          <h2 className="mt-3 max-w-sm text-2xl font-bold leading-snug text-white">
            Manage residents, requests, and records — all in one place.
          </h2>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 flex-col justify-between px-8 py-10">
        <div />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-85">
            <BrandMark className="mb-8 h-6 w-6 lg:hidden" />

            <h1 className="text-[28px] font-bold leading-tight text-[#1F2937] dark:text-white">
              {step === "credentials" ? "Welcome back!" : "Enter your code"}
            </h1>
            <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              {step === "credentials"
                ? "Residents, requests, records — all in one place."
                : "Open your authenticator app, or use a backup code."}
            </p>

            {step === "credentials" ? (
              <form onSubmit={handleCredentialsSubmit} className="mt-8 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 pr-11 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1F2937] dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && <p className="text-xs text-[#A32A25] dark:text-[#E0716C]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTotpSubmit} className="mt-8 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="123456 or XXXX-XXXX"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 text-center text-lg tracking-widest text-[#1F2937] placeholder:text-sm placeholder:tracking-normal placeholder:text-[#9CA3AF] transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                />

                {error && <p className="text-xs text-[#A32A25] dark:text-[#E0716C]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setTotp("");
                    setError("");
                  }}
                  className="text-center text-xs text-[#6B7280] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:text-white"
                >
                  Back
                </button>
              </form>
            )}

            <p className="mt-5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Access is provisioned by your barangay administrator.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          <span>Brgy-RMS</span>
          <span className="h-1 w-1 rounded-full bg-[#E9EAEC] dark:bg-[#262626]" />
          <Link href="/verify" className="hover:text-[#1F2937] dark:hover:text-white">
            Verify a certificate
          </Link>
        </div>
      </div>
    </div>
  );
}