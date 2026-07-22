-- Add certificate_no as nullable first so existing rows aren't rejected
-- by a NOT NULL constraint before they have a value.
ALTER TABLE "public"."Certificate" ADD COLUMN "certificate_no" TEXT;

-- Backfill any certificates issued before this column existed with a
-- deterministic, unique number derived from their id and issue year, in
-- the same "CERT-YYYY-NNNNNN" format newly created certificates get.
UPDATE "public"."Certificate"
SET "certificate_no" = 'CERT-' || EXTRACT(YEAR FROM "issued_at")::text || '-' || LPAD("id"::text, 6, '0')
WHERE "certificate_no" IS NULL;

-- Now that every row has a value, enforce NOT NULL + uniqueness.
ALTER TABLE "public"."Certificate" ALTER COLUMN "certificate_no" SET NOT NULL;
CREATE UNIQUE INDEX "Certificate_certificate_no_key" ON "public"."Certificate"("certificate_no");