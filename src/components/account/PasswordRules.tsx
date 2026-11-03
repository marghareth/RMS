// FILE: src/components/account/PasswordRules.tsx
//
// One short line under a new-password field listing what it needs. Each
// part turns green once the password has it. Same rules the server
// enforces (src/lib/password-policy.ts).
"use client";

import { passwordRules } from "@/lib/password-policy";

export default function PasswordRules({ password }: { password: string }) {
  const rules = passwordRules(password);
  return (
    <p className="mt-1.5 text-[12px] leading-relaxed text-[#9CA3AF] dark:text-[#737373]">
      Needs{" "}
      {rules.map((r, i) => (
        <span key={r.id}>
          <span className={r.ok ? "text-[#059669] dark:text-[#34D399]" : undefined}>{r.label}</span>
          {i < rules.length - 2 ? ", " : i === rules.length - 2 ? " and " : "."}
        </span>
      ))}
    </p>
  );
}