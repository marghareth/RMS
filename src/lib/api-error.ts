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

export function apiErrorMessage(body: ApiErrorBody, fallback: string): string {
  if (Array.isArray(body?.issues) && body.issues.length > 0) {
    return body.issues
      .map((i) => {
        const msg = i.message ?? "is invalid";
        return i.path ? `${humanizeFieldPath(i.path)}: ${msg}` : msg;
      })
      .join(" • ");
  }
  return body?.message || body?.error || fallback;
}