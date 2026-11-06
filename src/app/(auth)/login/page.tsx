// FILE: src/app/(auth)/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import BarangayLogo from "@/components/shared/BarangayLogo";

// Small reusable brand mark — same house/flag glyph used in the sidebar
// header (src/components/layout/Sidebar.tsx) so the login screen reads
// as the same product rather than a different login vendor bolted on.
// Declared at module scope (not inside LoginPage) — a component defined
// during render gets torn down and recreated on every re-render, which
// resets any state/DOM it owns. This one is stateless today, but the
// lint rule (react-hooks/static-components) flags the pattern itself
// since it silently breaks the moment the component gains state.
function BrandMark({ className = "h-6 w-6", fill = "#2348B0" }: { className?: string; fill?: string }) {
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

// Never let a hung request leave the button on "Signing in..." forever.
function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms)),
  ]);
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // ?changed=1 — sent here after changing a password, which signs you out.
  const passwordChanged = useSearchParams().get("changed") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once a username/password check comes back needing a second factor,
  // we swap to this step rather than a full separate page — same form,
  // same session of intent, just one more field.
  const [step, setStep] = useState<"credentials" | "totp" | "forgot">("credentials");
  const [totp, setTotp] = useState("");

  // "Forgot password?" only files a request for an Admin or Secretary to
  // approve after confirming who you are (src/app/api/forgot-password).
  const [forgotSent, setForgotSent] = useState("");

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await withTimeout(
        fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Couldn't send the request. Try again.");
      } else {
        setForgotSent(data.message);
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    }
    setLoading(false);
  }

  function goTo(next: "credentials" | "forgot") {
    setStep(next);
    setError("");
    setForgotSent("");
    setTotp("");
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res;
    try {
      res = await withTimeout(signIn("credentials", { username, password, redirect: false }));
    } catch (err) {
      // signIn() rejecting or timing out (network failure, server hung on the
      // database, etc.) used to leave the button stuck on "Signing in..."
      // forever. Surface it as a normal error instead.
      setError(
        err instanceof Error && err.message === "TIMEOUT"
          ? "The server took too long to respond (20s). The database may be unreachable."
          : "Couldn't reach the server. Please check your connection and try again."
      );
      setLoading(false);
      return;
    }

    if (res?.ok) {
      // Hard navigation so the freshly-set session cookie is sent on the
      // very next request (router.push can race it and bounce back to /login).
      window.location.assign("/dashboard");
      return;
    }

    if (res?.error === "MFA_REQUIRED") {
      setStep("totp");
      setLoading(false);
      return;
    }

    if (res?.error === "TEMP_PASSWORD_EXPIRED") {
      setError("Your temporary password has expired. Use \"Forgot password?\" to ask for a new one.");
      setLoading(false);
      return;
    }

    // "CredentialsSignin" is the normal wrong-password result; anything else
    // (Configuration, a Prisma error…) is a server problem — show the code.
    setError(
      !res?.error || res.error === "CredentialsSignin"
        ? "Invalid username or password."
        : `Sign-in failed on the server (${res.error}). Check the deployment logs.`
    );
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
      <div className="relative hidden w-[44%] shrink-0 overflow-hidden bg-linear-to-br from-(--brand) via-(--brand-hover) to-[#12151C] lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* decorative glow — same blue family as the gradient, no new hues */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#12151C]/50 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <BarangayLogo className="h-10 w-10 rounded-full bg-white p-0.5" fallback={<BrandMark className="h-7 w-7 shrink-0" fill="#FFFFFF" />} />
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
            <div className="mb-8 lg:hidden">
              <BarangayLogo className="h-12 w-12" fallback={<BrandMark className="h-6 w-6" />} />
            </div>

            <h1 className="text-[28px] font-bold leading-tight text-[#1F2937] dark:text-white">
              {step === "credentials" ? "Welcome back!" : step === "totp" ? "Enter your code" : "Forgot password?"}
            </h1>
            <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              {step === "credentials"
                ? "Residents, requests, records — all in one place."
                : step === "totp"
                  ? "Open your authenticator app, or use a backup code."
                  : forgotSent
                    ? "Request sent."
                    : "Enter your username and we'll let the barangay administrator know."}
            </p>

            {passwordChanged && step === "credentials" && (
              <p className="mt-6 text-sm text-[#047857] dark:text-[#6EE7B7]">
                Your password was changed. Sign in with the new one.
              </p>
            )}

            {step === "forgot" ? (
              forgotSent ? (
                <div className="mt-8 flex flex-col gap-3">
                  <p className="text-sm leading-relaxed text-[#374151] dark:text-[#D4D4D4]">{forgotSent}</p>
                  <button
                    type="button"
                    onClick={() => goTo("credentials")}
                    className="mt-1 w-full rounded-lg bg-(--brand) py-3 text-sm font-semibold text-white transition hover:bg-(--brand-hover)"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="mt-8 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition focus:border-(--brand-line) focus:outline-none focus:ring-2 focus:ring-(--brand-line)/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                  />

                  {error && <p className="text-xs text-[#A32A25] dark:text-[#E0716C]">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-(--brand) py-3 text-sm font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      "Send request"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("credentials")}
                    className="text-center text-xs text-[#6B7280] hover:text-[#1F2937] dark:text-[#9CA3AF] dark:hover:text-white"
                  >
                    Back to sign in
                  </button>
                </form>
              )
            ) : step === "credentials" ? (
              <form onSubmit={handleCredentialsSubmit} className="mt-8 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition focus:border-(--brand-line) focus:outline-none focus:ring-2 focus:ring-(--brand-line)/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 pr-11 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition focus:border-(--brand-line) focus:outline-none focus:ring-2 focus:ring-(--brand-line)/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
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

                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => goTo("forgot")}
                    className="text-xs font-medium text-(--brand-fg) hover:text-(--brand-fg-strong)"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && <p className="text-xs text-[#A32A25] dark:text-[#E0716C]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-(--brand) py-3 text-sm font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-70"
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
                  className="w-full rounded-lg border border-[#E9EAEC] bg-white px-4 py-3 text-center text-lg tracking-widest text-[#1F2937] placeholder:text-sm placeholder:tracking-normal placeholder:text-[#9CA3AF] transition focus:border-(--brand-line) focus:outline-none focus:ring-2 focus:ring-(--brand-line)/20 dark:border-[#262626] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#6B7280]"
                />

                {error && <p className="text-xs text-[#A32A25] dark:text-[#E0716C]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-(--brand) py-3 text-sm font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-70"
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
                  onClick={() => goTo("credentials")}
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