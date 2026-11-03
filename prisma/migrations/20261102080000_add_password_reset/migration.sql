-- FILE: prisma/migrations/20261102080000_add_password_reset/migration.sql
--
-- Change-your-own-password and approved "Forgot password?" resets.
-- Existing accounts keep working as they are: must_change_password starts
-- false and password_changed_at starts at the time of this migration.

-- CreateEnum
CREATE TYPE "public"."PasswordResetStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."User" ADD COLUMN "temp_password_expires_at" TIMESTAMP(3);
ALTER TABLE "public"."User" ADD COLUMN "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."PasswordResetRequest" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "public"."PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" INTEGER,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequest_status_requested_at_idx" ON "public"."PasswordResetRequest"("status", "requested_at");
CREATE INDEX "PasswordResetRequest_user_id_idx" ON "public"."PasswordResetRequest"("user_id");

-- AddForeignKey
ALTER TABLE "public"."PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;