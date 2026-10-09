-- FILE: prisma/migrations/20261009000000_add_rate_limits_and_session_hardening/migration.sql

-- ── TOTP replay protection / session invalidation on password change ──
ALTER TABLE "User"
  ADD COLUMN "mfa_last_step"       INTEGER,
  ADD COLUMN "password_changed_at" TIMESTAMP(3);

-- ── Shared rate-limit counters ───────────────────────────────────────
-- Replaces the per-process in-memory Map, which on serverless hosting
-- reset on every cold start and was not shared between instances.
CREATE TABLE "RateLimitBucket" (
    "key"               TEXT NOT NULL,
    "count"             INTEGER NOT NULL,
    "window_started_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
