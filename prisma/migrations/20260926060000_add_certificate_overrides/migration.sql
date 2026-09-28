-- Nullable: null means "use the resident's real name/address as usual" —
-- see buildCertificatePdfProps.ts, which only prefers these over the live
-- resident data when a value is actually set.
ALTER TABLE "public"."Certificate" ADD COLUMN "override_full_name" TEXT;
ALTER TABLE "public"."Certificate" ADD COLUMN "override_address" TEXT;