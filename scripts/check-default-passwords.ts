// FILE: scripts/check-default-passwords.ts
//
// Finds user accounts that still have a default or easily guessed password
// (admin/admin123, captain/captain123, "password", "<username>123", …) and,
// if asked, fixes them. Meant to be run once against the LIVE database —
// the old seed script created those six accounts, and `upsert … update: {}`
// means re-seeding never changed them.
//
// Usage (from the project root, with DATABASE_URL pointing at the database
// you want to check — e.g. your Supabase connection string):
//
//   npm run security:check-passwords                 # report only, changes nothing
//   npm run security:check-passwords -- --rotate     # give each flagged account a new random password
//   npm run security:check-passwords -- --deactivate # switch flagged accounts off instead
//
// Passing a one-off URL without editing .env:
//   DATABASE_URL="postgresql://…" npx tsx scripts/check-default-passwords.ts
//
// --rotate prints each new password ONCE. Hand it to the account owner
// privately and have them change it after signing in. Every change is written
// to the audit log. Exit code is 1 when weak passwords were found and left
// unchanged, so this can also be used as a check in CI or a deploy script.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateStrongPassword, weakPasswordCandidates } from "../src/lib/weak-passwords";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const ROTATE = args.has("--rotate");
const DEACTIVATE = args.has("--deactivate");

async function findWeakPassword(username: string, passwordHash: string): Promise<string | null> {
  for (const candidate of weakPasswordCandidates(username)) {
    if (await bcrypt.compare(candidate, passwordHash)) return candidate;
  }
  return null;
}

/** Shows the first two characters only, so the report itself isn't a password list. */
function hint(password: string) {
  return `${password.slice(0, 2)}${"•".repeat(Math.max(0, password.length - 2))}`;
}

async function main() {
  if (ROTATE && DEACTIVATE) {
    console.error("Choose either --rotate or --deactivate, not both.");
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Point it at the database you want to check.");
    process.exit(2);
  }

  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL!).hostname;
    } catch {
      return "(unparsable DATABASE_URL)";
    }
  })();
  console.log(`\nChecking user passwords on ${host} …\n`);

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, is_active: true, mfa_enabled: true, password_hash: true },
    orderBy: { id: "asc" },
  });

  const flagged: { id: number; username: string; role: string; is_active: boolean; matched: string }[] = [];
  for (const u of users) {
    const matched = await findWeakPassword(u.username, u.password_hash);
    const status = matched ? `WEAK (${hint(matched)})` : "ok";
    console.log(
      `  ${u.username.padEnd(16)} ${u.role.padEnd(10)} ${(u.is_active ? "active" : "inactive").padEnd(9)} ` +
        `${(u.mfa_enabled ? "2FA on" : "2FA off").padEnd(8)} ${status}`
    );
    if (matched) flagged.push({ id: u.id, username: u.username, role: u.role, is_active: u.is_active, matched });
  }

  console.log(`\n${users.length} account(s) checked, ${flagged.length} with a weak/default password.`);
  if (flagged.length === 0) return;

  if (!ROTATE && !DEACTIVATE) {
    console.log("\nNothing was changed. Re-run with --rotate (new random passwords) or --deactivate (switch them off).");
    process.exitCode = 1;
    return;
  }

  const newPasswords: { username: string; password: string }[] = [];

  for (const u of flagged) {
    if (ROTATE) {
      const password = generateStrongPassword();
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: u.id }, data: { password_hash: await bcrypt.hash(password, 10) } });
        await tx.auditLog.create({
          data: {
            user_id: u.id,
            action: "UPDATE",
            table_affected: "User",
            record_id: u.id,
            details: `Password reset by scripts/check-default-passwords.ts: account "${u.username}" had a default/weak password.`,
          },
        });
      });
      newPasswords.push({ username: u.username, password });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: u.id }, data: { is_active: false } });
        await tx.auditLog.create({
          data: {
            user_id: u.id,
            action: "DEACTIVATE",
            table_affected: "User",
            record_id: u.id,
            details: `Deactivated by scripts/check-default-passwords.ts: account "${u.username}" had a default/weak password.`,
          },
        });
      });
      console.log(`  deactivated ${u.username}`);
    }
  }

  if (newPasswords.length > 0) {
    console.log("\nNew passwords — shown only this once. Give each to its owner privately:\n");
    for (const p of newPasswords) console.log(`  ${p.username.padEnd(16)} ${p.password}`);
    console.log("\nAsk each person to sign in and set up two-factor authentication under Account → Security.");
  }
  // A password change alone doesn't end sessions that are already signed in
  // (--deactivate does, since every request re-checks is_active). Changing
  // NEXTAUTH_SECRET invalidates every existing session token.
  console.log(
    "\nTip: if you think someone else already used a default password, also change NEXTAUTH_SECRET in Vercel — that signs every session out."
  );
}

main()
  .catch((e) => {
    console.error("❌ Check failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());