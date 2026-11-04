// FILE: src/components/shared/FieldError.tsx
//
// The red message under a form field that has a problem, e.g. "Resident
// since can't be before the birthdate." Messages come from
// src/lib/form-rules.ts, the same rules the API enforces.
//
// Use with `fieldErrorBorder` on the input so the field itself turns red.

import { AlertCircle } from "lucide-react";

/** Border classes for an input that has an error. */
export const fieldErrorBorder = "border-[#F87171] dark:border-[#F87171] focus:border-[#EF4444]";

export default function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 flex items-start gap-1 text-[11.5px] leading-snug text-[#DC2626] dark:text-[#F87171]">
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}