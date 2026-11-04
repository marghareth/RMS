// FILE: src/lib/validation-error.ts
//
// Server side of src/lib/form-rules.ts: turns a list of problems into the
// same 400 VALIDATION_ERROR response a failed schema gives (see
// withErrorHandling in api-handler.ts), with one issue per field.
//
//   throwIfProblems(residentProblems(merged));

import { ZodError } from "zod";
import type { FieldProblem } from "./form-rules";

export function throwIfProblems(problems: FieldProblem[]): void {
  if (problems.length === 0) return;
  throw new ZodError(
    problems.map((p) => ({ code: "custom" as const, path: [p.field], message: p.message, input: undefined }))
  );
}

/**
 * What a record will look like after a partial update: the existing values,
 * with every field the request actually sent laid on top. (A plain
 * `{ ...existing, ...body }` would let an omitted field, which parses to
 * undefined, blank out the existing value.)
 */
export function withChanges<T extends object, U extends object>(existing: T, changes: U): T & U {
  const out = { ...existing } as Record<string, unknown>;
  for (const [k, v] of Object.entries(changes)) if (v !== undefined) out[k] = v;
  return out as T & U;
}