-- FILE: prisma/migrations/20261107080000_add_appropriation_subcategory/migration.sql
--
-- Appropriation sub-categories (Nov 2026): an optional second level under
-- the official PS / MOOE / CO classes, e.g. MOOE → "Office Supplies".
-- PS / MOOE / CO are unchanged, so the Budget Overview and reports still
-- group by them. Existing appropriations simply have no sub-category.
-- The list of choices lives in "SystemSetting" (no table change needed).

-- AlterTable
ALTER TABLE "public"."Appropriation" ADD COLUMN "subcategory" TEXT;

-- Filtering the Appropriations list by class + sub-category.
CREATE INDEX "Appropriation_category_subcategory_idx" ON "public"."Appropriation"("category", "subcategory");