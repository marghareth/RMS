// FILE: src/lib/api-handler.ts
//
// Shared error-handling wrapper for API route handlers.
//
// Wrap any GET/POST/PUT/DELETE handler with `withErrorHandling(...)` and it
// will catch:
//   - ZodError            -> 400 with field-level validation messages
//   - Prisma known errors -> mapped to the right HTTP status (409/404/400)
//   - anything else       -> 500, logged server-side, generic message to client
//
// This lets individual route handlers throw/parse freely instead of
// repeating try/catch boilerplate in every file.

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<Record<string, string>> } | undefined;
type Handler = (req: NextRequest, context?: RouteContext) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      return toErrorResponse(err, req);
    }
  };
}

// Prisma error codes meaning "couldn't talk to the database" rather than
// "the query was wrong": P1001 can't reach server, P1002 reached but timed
// out, P1008 operation timed out, P1017 server closed the connection,
// P2024 connection-pool timeout.
const DB_UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

/** True for connection-level Prisma failures (see DB_UNAVAILABLE_CODES). */
export function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  return err instanceof Prisma.PrismaClientKnownRequestError && DB_UNAVAILABLE_CODES.has(err.code);
}

function toErrorResponse(err: unknown, req: NextRequest): NextResponse {
  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  // ── Database unreachable / timed out ─────────────────────────────────────
  // Not the caller's fault and not a bug in the request: the server simply
  // can't reach Postgres (paused Supabase project, network/firewall block,
  // wrong DATABASE_URL, pool exhausted…). Say so with a 503 instead of a
  // generic 500 so it's obvious what to check. The raw Prisma message
  // (which includes the DB host) is logged server-side only.
  if (isDatabaseUnavailable(err)) {
    console.error(`[${req.method} ${req.nextUrl.pathname}] Database unavailable:`, (err as Error).message);
    return NextResponse.json(
      {
        error: "DATABASE_UNAVAILABLE",
        message: "The database is currently unreachable. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  // ── Known Prisma errors ──────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // unique constraint violation
        return NextResponse.json(
          {
            error: "DUPLICATE",
            message: `A record with this ${(err.meta?.target as string[])?.join(", ") || "value"} already exists.`,
          },
          { status: 409 }
        );
      case "P2025": // record to update/delete not found
        return NextResponse.json(
          { error: "NOT_FOUND", message: "The requested record was not found." },
          { status: 404 }
        );
      case "P2003": // foreign key constraint violation
        return NextResponse.json(
          { error: "INVALID_REFERENCE", message: "One of the referenced records does not exist." },
          { status: 400 }
        );
      default:
        console.error(`[${req.method} ${req.nextUrl.pathname}] Prisma error ${err.code}:`, err.message);
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "A database error occurred." },
          { status: 400 }
        );
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error(`[${req.method} ${req.nextUrl.pathname}] Prisma validation error:`, err.message);
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid data was sent to the database." },
      { status: 400 }
    );
  }

  // ── Explicit thrown API errors (see ApiError below) ─────────────────────
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  console.error(`[${req.method} ${req.nextUrl.pathname}] Unhandled error:`, err);
  return NextResponse.json(
    { error: "SERVER_ERROR", message: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

// Lets route handlers throw a clean, typed error instead of manually
// constructing a NextResponse for expected failure cases, e.g.:
//   throw new ApiError(404, "NOT_FOUND", "Resident not found");
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}