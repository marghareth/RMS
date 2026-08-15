-- AlterTable: add as nullable first
ALTER TABLE "Certificate" ADD COLUMN "verification_code" TEXT;

-- Backfill every existing row with a unique value
UPDATE "Certificate" SET "verification_code" = gen_random_uuid()::text WHERE "verification_code" IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE "Certificate" ALTER COLUMN "verification_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verification_code_key" ON "Certificate"("verification_code");