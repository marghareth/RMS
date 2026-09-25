-- Nullable on purpose: existing residents were never asked for this date,
-- so there's nothing correct to backfill it with. The certificate
-- eligibility check (see /api/certificates POST) falls back to
-- `created_at` for any row where this is still null, which is exactly the
-- old (imperfect) behavior — this migration only changes things going
-- forward, for residents added or edited after it runs.
ALTER TABLE "public"."Resident" ADD COLUMN "residency_start_date" TIMESTAMP(3);