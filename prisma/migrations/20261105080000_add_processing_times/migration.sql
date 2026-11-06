-- FILE: prisma/migrations/20261105080000_add_processing_times/migration.sql
--
-- Processing time (Nov 2026): records each step of a request so the
-- Processing Time report can show how long encoding, waiting and
-- processing take, for comparison with the manual process.
-- All columns are optional; existing records keep working and show "—"
-- for the steps that weren't recorded back then.

-- AlterTable
ALTER TABLE "public"."Certificate" ADD COLUMN "form_opened_at" TIMESTAMP(3);
ALTER TABLE "public"."Certificate" ADD COLUMN "processing_started_at" TIMESTAMP(3);
ALTER TABLE "public"."Certificate" ADD COLUMN "printed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."BarangayId" ADD COLUMN "form_opened_at" TIMESTAMP(3);
ALTER TABLE "public"."BarangayId" ADD COLUMN "printed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."BlotterCase" ADD COLUMN "form_opened_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."EquipmentBorrowing" ADD COLUMN "form_opened_at" TIMESTAMP(3);