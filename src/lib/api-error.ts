// FILE: src/lib/api-error.ts
//
// Turns an API error response body into one human-readable string for forms.
//
// Validation failures come back as
//   { error: "VALIDATION_ERROR", message: "One or more fields are invalid.",
//     issues: [{ path: "mobile", message: "must be a Philippine mobile number…" }] }
// Showing just `message` tells the encoder *something* is wrong but not
// *what*; this lists each field's problem so they can fix it.

type ApiIssue = { path?: string; message?: string };
type ApiErrorBody = { error?: string; message?: string; issues?: ApiIssue[] } | null | undefined;

/** "philsys_card_no" -> "Philsys Card No", "mobile" -> "Mobile" */
export function humanizeFieldPath(path: string): string {
  const last = path.split(".").pop() ?? path;
  return last
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * One issue as text. A full sentence ("Resident since can't be before the
 * birthdate.", from src/lib/form-rules.ts) is shown as is; a fragment
 * ("must be a Philippine mobile number") gets its field name in front.
 */
export function issueText(i: ApiIssue): string {
  const msg = i.message ?? "is invalid";
  const sentence = /^[A-Z₱]/.test(msg) && /[.!?)]$/.test(msg);
  return i.path && !sentence ? `${humanizeFieldPath(i.path)}: ${msg}` : msg;
}

/** The top-level `message` of a validation error: the first problem, plus how many more. */
export function validationSummary(issues: ApiIssue[]): string {
  if (issues.length === 0) return "One or more fields are invalid.";
  const first = issueText(issues[0]);
  return issues.length === 1 ? first : `${first} (and ${issues.length - 1} more problem${issues.length === 2 ? "" : "s"})`;
}

export function apiErrorMessage(body: ApiErrorBody, fallback: string): string {
  if (Array.isArray(body?.issues) && body.issues.length > 0) {
    return body.issues.map(issueText).join(" • ");
  }
  return body?.message || body?.error || fallback;
}