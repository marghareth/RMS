-- FILE: prisma/migrations/20260913000000_add_mfa_and_immutable_audit_log/migration.sql

-- ── TOTP multi-factor auth columns ──────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "mfa_enabled"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfa_secret"       TEXT,
  ADD COLUMN "mfa_backup_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── Make AuditLog append-only ────────────────────────────────────
-- An audit trail that can be edited or deleted after the fact isn't an
-- audit trail — anyone with UPDATE/DELETE on this table (an admin doing
-- a manual DB fix, a compromised app credential, a future bug in some
-- cleanup script) could rewrite history. This trigger rejects any
-- UPDATE or DELETE against "AuditLog" at the database level, regardless
-- of which role issues it, so the only way to touch existing rows is to
-- explicitly disable this trigger first — a deliberate, logged DBA
-- action rather than something that can happen silently through the app
-- or an ad-hoc query.
--
-- NOTE: this does not stop a superuser from running
-- `ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_immutable;` first —
-- no in-database mechanism can fully prevent that. What it does stop is
-- silent/accidental mutation through the app's normal DB role, and it
-- ensures any deliberate bypass leaves its own trace in Postgres's own
-- logs/DDL history.
CREATE OR REPLACE FUNCTION audit_log_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog rows are append-only: % is not permitted on "AuditLog" (id=%)',
    TG_OP,
    COALESCE(OLD.id, NULL);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable ON "AuditLog";

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_block_mutation();