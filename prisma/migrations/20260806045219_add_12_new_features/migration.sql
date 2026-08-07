-- FILE: prisma/migrations/<keep-your-own-generated-timestamp>_add_12_new_features/migration.sql
-- NOTE: keep the folder name Prisma already generated on your machine
-- (e.g. 20260806153000_add_12_new_features) — only the migration.sql
-- contents inside that folder should be replaced with this file.

/*
  Warnings:

  - The `condition` column on the `Equipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[queue_number]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `incident_type` to the `BlotterCase` table without a default value. Existing rows are backfilled with 'Unspecified' below.
  - Added the required column `queue_number` to the `Certificate` table without a default value. Existing rows are backfilled with 'Q-LEGACY-<id>' below.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('GOOD', 'FAIR', 'POOR', 'NEEDS_REPAIR', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgendaItemStatus" AS ENUM ('PENDING', 'DISCUSSED', 'APPROVED');

-- CreateEnum
CREATE TYPE "FundSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppropriationCategory" AS ENUM ('PS', 'MOOE', 'CO');

-- CreateEnum
CREATE TYPE "AppropriationStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED');

-- AlterTable
-- (patched) add as nullable first, backfill, then enforce NOT NULL —
-- the plain "ADD COLUMN ... NOT NULL" Prisma generated fails because this
-- table already has 1 row.
ALTER TABLE "BlotterCase" ADD COLUMN     "incident_type" TEXT;
UPDATE "BlotterCase" SET "incident_type" = 'Unspecified' WHERE "incident_type" IS NULL;
ALTER TABLE "BlotterCase" ALTER COLUMN "incident_type" SET NOT NULL;

-- AlterTable
-- (patched) queue_number pulled out of the multi-column ADD COLUMN so it
-- can be added nullable, backfilled with a unique legacy value per row,
-- then enforced NOT NULL — same reason as above.
ALTER TABLE "Certificate" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "queue_number" TEXT,
ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "issued_at" DROP NOT NULL,
ALTER COLUMN "issued_at" DROP DEFAULT;

UPDATE "Certificate" SET "queue_number" = 'Q-LEGACY-' || "id" WHERE "queue_number" IS NULL;

ALTER TABLE "Certificate" ALTER COLUMN "queue_number" SET NOT NULL;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "asset_type" TEXT,
ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "current_value" DECIMAL(12,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "purchase_cost" DECIMAL(12,2),
ADD COLUMN     "purchase_date" TIMESTAMP(3),
ADD COLUMN     "serial_number" TEXT,
DROP COLUMN "condition",
ADD COLUMN     "condition" "AssetCondition";

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "household_unit" TEXT,
ADD COLUMN     "household_unit_other" TEXT,
ADD COLUMN     "housing_type_other" TEXT,
ADD COLUMN     "monthly_income" DECIMAL(12,2),
ADD COLUMN     "no_of_families" INTEGER,
ADD COLUMN     "power_supply" TEXT,
ADD COLUMN     "tenure_other" TEXT,
ADD COLUMN     "tenure_status" TEXT,
ADD COLUMN     "waste_disposal" TEXT;

-- AlterTable
ALTER TABLE "MeetingRecord" ADD COLUMN     "location" TEXT,
ADD COLUMN     "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Resident" ADD COLUMN     "barangay" TEXT,
ADD COLUMN     "blood_type" TEXT,
ADD COLUMN     "city_municipality" TEXT,
ADD COLUMN     "complexion" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "ethnicity" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "height_m" DECIMAL(4,2),
ADD COLUMN     "house_block_lot_no" TEXT,
ADD COLUMN     "is_deceased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_registered_voter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_resident_voter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_voted_year" INTEGER,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "mothers_maiden_name" TEXT,
ADD COLUMN     "philsys_card_no" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "residence_of_mother_upon_birth" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "subdivision_village" TEXT,
ADD COLUMN     "tel_no" TEXT,
ADD COLUMN     "type_of_resident" TEXT,
ADD COLUMN     "weight_kg" DECIMAL(5,2),
ADD COLUMN     "zip_code" TEXT;

-- CreateTable
CREATE TABLE "Migrant" (
    "id" SERIAL NOT NULL,
    "household_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "previous_location" TEXT,
    "reason" TEXT,
    "transferred_to" TEXT,
    "duration_here" TEXT,
    "has_returned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Migrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentSector" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "sector_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentAssistance" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "program_name" TEXT NOT NULL,
    "date_enrolled" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentAssistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IncidentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "AgendaItemStatus" NOT NULL DEFAULT 'PENDING',
    "minutes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" SERIAL NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "contact" TEXT,
    "purpose" TEXT NOT NULL,
    "person_to_visit" TEXT,
    "time_in" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_out" TIMESTAMP(3),
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeceasedRecord" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "date_of_death" TIMESTAMP(3) NOT NULL,
    "immediate_cause" TEXT NOT NULL,
    "underlying_cause" TEXT,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeceasedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_type" TEXT,
    "meeting_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundSource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "statutory_rule" TEXT,
    "status" "FundSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "original_balance" DECIMAL(14,2),
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appropriation" (
    "id" SERIAL NOT NULL,
    "item_name" TEXT NOT NULL,
    "category" "AppropriationCategory" NOT NULL,
    "appropriated_amount" DECIMAL(14,2) NOT NULL,
    "obligated_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disbursed_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payee" TEXT,
    "status" "AppropriationStatus" NOT NULL DEFAULT 'PENDING',
    "fund_source_id" INTEGER,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appropriation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revenue" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT,
    "income_account" TEXT,
    "coa_code" TEXT,
    "fund_source_id" INTEGER,
    "or_number" TEXT,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payee" TEXT NOT NULL,
    "particular" TEXT,
    "check_number" TEXT,
    "or_number" TEXT,
    "appropriation_id" INTEGER,
    "item" TEXT,
    "fund_source_id" INTEGER,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPreference" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "widget_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResidentSector_resident_id_sector_type_key" ON "ResidentSector"("resident_id", "sector_type");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentType_name_key" ON "IncidentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeceasedRecord_resident_id_key" ON "DeceasedRecord"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_meeting_id_key" ON "CalendarEvent"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardPreference_user_id_widget_key_key" ON "DashboardPreference"("user_id", "widget_key");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_queue_number_key" ON "Certificate"("queue_number");

-- AddForeignKey
ALTER TABLE "Migrant" ADD CONSTRAINT "Migrant_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentSector" ADD CONSTRAINT "ResidentSector_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentAssistance" ADD CONSTRAINT "GovernmentAssistance_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "MeetingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorLog" ADD CONSTRAINT "VisitorLog_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceasedRecord" ADD CONSTRAINT "DeceasedRecord_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceasedRecord" ADD CONSTRAINT "DeceasedRecord_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "MeetingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundSource" ADD CONSTRAINT "FundSource_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appropriation" ADD CONSTRAINT "Appropriation_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "FundSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appropriation" ADD CONSTRAINT "Appropriation_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "FundSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_appropriation_id_fkey" FOREIGN KEY ("appropriation_id") REFERENCES "Appropriation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "FundSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;