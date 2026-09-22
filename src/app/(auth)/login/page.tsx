// FILE: src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
    <div className="flex min-h-screen flex-col justify-between bg-white px-8 py-10">
      <div />

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-85">
          {/* mark */}
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="mb-8">
            <path
              d="M12 0L2 13h7l-2 11 11-14h-7l1-10z"
              fill="#0A0A0A"
            />
          </svg>

          <h1 className="text-[28px] font-bold leading-tight text-[#0A0A0A]">
            {step === "credentials" ? "Welcome back!" : "Enter your code"}
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
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
                className="w-full rounded-lg border border-[#E5E5E5] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] transition focus:border-[#0A0A0A] focus:outline-none"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-4 py-3 pr-11 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] transition focus:border-[#0A0A0A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#0A0A0A]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] py-3 text-sm font-semibold text-white transition hover:bg-[#262626] disabled:opacity-70"
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
                className="w-full rounded-lg border border-[#E5E5E5] px-4 py-3 text-center text-lg tracking-widest text-[#0A0A0A] placeholder:text-sm placeholder:tracking-normal placeholder:text-[#A3A3A3] transition focus:border-[#0A0A0A] focus:outline-none"
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] py-3 text-sm font-semibold text-white transition hover:bg-[#262626] disabled:opacity-70"
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
                className="text-center text-xs text-[#737373] hover:text-[#0A0A0A]"
              >
                Back
              </button>
            </form>
          )}

          <p className="mt-5 text-xs text-[#737373]">
            Access is provisioned by your barangay administrator.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-[#A3A3A3]">
        <span>Brgy-RMS</span>
        <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" />
        <Link href="/verify" className="hover:text-[#0A0A0A]">
          Verify a certificate
        </Link>
      </div>
    </div>
  );
}