-- FILE: prisma/migrations/20261108090000_add_user_full_name/migration.sql
-- Name and position on user accounts, printed on the "Prepared by" line of
-- printed reports instead of the username. Both optional; existing accounts
-- keep working with them empty.
ALTER TABLE "User" ADD COLUMN "full_name" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN "position" VARCHAR(100);