-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CAPTAIN', 'SECRETARY', 'KAGAWAD', 'BHW', 'ENCODER');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'LIVE_IN');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('RESIDENCY', 'INDIGENCY', 'CLEARANCE', 'GOOD_MORAL', 'BUSINESS_PERMIT', 'COHABITATION', 'SOLO_PARENT', 'FIRST_TIME_JOB_SEEKER', 'LATE_REGISTRATION');

-- CreateEnum
CREATE TYPE "BlotterStatus" AS ENUM ('FILED', 'ONGOING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RegistryType" AS ENUM ('SENIOR_CITIZEN', 'PWD', 'FOUR_PS');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('SERVICEABLE', 'UNSERVICEABLE', 'MISSING');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('SB_MEETING', 'BARANGAY_ASSEMBLY');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ENCODER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purok" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Purok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" SERIAL NOT NULL,
    "household_no" TEXT NOT NULL,
    "purok_id" INTEGER NOT NULL,
    "household_head_id" INTEGER,
    "address" TEXT NOT NULL,
    "housing_type" TEXT,
    "water_source" TEXT,
    "comfort_room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" SERIAL NOT NULL,
    "household_id" INTEGER,
    "purok_id" INTEGER,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "mname" TEXT,
    "name_extension" TEXT,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "place_of_birth" TEXT,
    "sex" TEXT NOT NULL,
    "civil_status" "CivilStatus" NOT NULL,
    "citizenship" TEXT NOT NULL DEFAULT 'Filipino',
    "religion" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Filipino',
    "employment_status" TEXT,
    "educational_attainment" TEXT,
    "occupation" TEXT,
    "income_bracket" TEXT,
    "sector" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER,
    "issued_by" INTEGER NOT NULL,
    "certificate_type" "CertificateType" NOT NULL,
    "purpose" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flagged_manual" BOOLEAN NOT NULL DEFAULT false,
    "manual_name" TEXT,
    "manual_address" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" SERIAL NOT NULL,
    "certificate_type" "CertificateType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "closing_line" TEXT,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlotterCase" (
    "id" SERIAL NOT NULL,
    "case_number" TEXT NOT NULL,
    "complainant_id" INTEGER,
    "complainant_name" TEXT NOT NULL,
    "complainant_contact" TEXT,
    "complainant_address" TEXT,
    "respondent_id" INTEGER,
    "respondent_name" TEXT NOT NULL,
    "incident_narrative" TEXT NOT NULL,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "hearing_date" TIMESTAMP(3),
    "status" "BlotterStatus" NOT NULL DEFAULT 'FILED',
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlotterCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlotterUpdate" (
    "id" SERIAL NOT NULL,
    "blotter_case_id" INTEGER NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "new_status" "BlotterStatus",
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlotterUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrgyOfficial" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "contact_no" TEXT,
    "photo_url" TEXT,
    "purok_assignment" TEXT,
    "term_start" TIMESTAMP(3) NOT NULL,
    "term_end" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BrgyOfficial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialRegistry" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "registry_type" "RegistryType" NOT NULL,
    "disability_type" TEXT,
    "is_4ps_beneficiary" BOOLEAN NOT NULL DEFAULT false,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "record_type" TEXT NOT NULL,
    "notes" TEXT,
    "recorded_by" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "date_given" TIMESTAMP(3) NOT NULL,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" SERIAL NOT NULL,
    "transaction_type" "FinancialType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "date_acquired" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentBorrowing" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "resident_id" INTEGER,
    "borrower_name" TEXT NOT NULL,
    "date_borrowed" TIMESTAMP(3) NOT NULL,
    "expected_return" TIMESTAMP(3) NOT NULL,
    "actual_return" TIMESTAMP(3),
    "return_condition" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentBorrowing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRecord" (
    "id" SERIAL NOT NULL,
    "meeting_type" "MeetingType" NOT NULL,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "minutes" TEXT,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarangayId" (
    "id" SERIAL NOT NULL,
    "resident_id" INTEGER NOT NULL,
    "id_number" TEXT NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by" INTEGER NOT NULL,

    CONSTRAINT "BarangayId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "table_affected" TEXT NOT NULL,
    "record_id" INTEGER,
    "details" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" SERIAL NOT NULL,
    "triggered_by" INTEGER NOT NULL,
    "backup_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_reference" TEXT,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Purok_name_key" ON "Purok"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Household_household_no_key" ON "Household"("household_no");

-- CreateIndex
CREATE UNIQUE INDEX "Household_household_head_id_key" ON "Household"("household_head_id");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplate_certificate_type_key" ON "CertificateTemplate"("certificate_type");

-- CreateIndex
CREATE UNIQUE INDEX "BlotterCase_case_number_key" ON "BlotterCase"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "BrgyOfficial_resident_id_key" ON "BrgyOfficial"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "BarangayId_id_number_key" ON "BarangayId"("id_number");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_purok_id_fkey" FOREIGN KEY ("purok_id") REFERENCES "Purok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_household_head_id_fkey" FOREIGN KEY ("household_head_id") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_purok_id_fkey" FOREIGN KEY ("purok_id") REFERENCES "Purok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlotterCase" ADD CONSTRAINT "BlotterCase_complainant_id_fkey" FOREIGN KEY ("complainant_id") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlotterCase" ADD CONSTRAINT "BlotterCase_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlotterUpdate" ADD CONSTRAINT "BlotterUpdate_blotter_case_id_fkey" FOREIGN KEY ("blotter_case_id") REFERENCES "BlotterCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlotterUpdate" ADD CONSTRAINT "BlotterUpdate_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrgyOfficial" ADD CONSTRAINT "BrgyOfficial_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialRegistry" ADD CONSTRAINT "SpecialRegistry_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentBorrowing" ADD CONSTRAINT "EquipmentBorrowing_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentBorrowing" ADD CONSTRAINT "EquipmentBorrowing_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentBorrowing" ADD CONSTRAINT "EquipmentBorrowing_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRecord" ADD CONSTRAINT "MeetingRecord_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarangayId" ADD CONSTRAINT "BarangayId_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarangayId" ADD CONSTRAINT "BarangayId_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
