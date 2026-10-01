// FILE: scripts/check-db.mjs
//
// Standalone database connectivity check. Does NOT import any app code, so
// it tells you whether "can't reach database" is an environment problem
// (paused Supabase project, firewall, wrong DATABASE_URL, env-file mix-up)
// or something inside the app.
//
// Run from the project root:   node scripts/check-db.mjs
//
// Steps: 1) which env file DATABASE_URL comes from   2) URL sanity checks
//        3) DNS lookup   4) raw TCP connect   5) a real Prisma query

import fs from "node:fs";
import net from "node:net";
import dns from "node:dns/promises";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => console.log(`  ✘ ${m}`);
const info = (m) => console.log(`    ${m}`);
const step = (n, m) => console.log(`\n[${n}] ${m}`);

// ── 1. Which env file wins? Next.js reads .env.local BEFORE .env (and a
// variable already set in your shell beats both). The Prisma CLI only reads
// .env — so the two can silently use different databases.
step(1, "Where does DATABASE_URL come from?");
let source = null;
if (process.env.DATABASE_URL) {
  source = "your shell environment (overrides every file)";
} else {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    const parsed = dotenv.parse(fs.readFileSync(file));
    if (parsed.DATABASE_URL) {
      process.env.DATABASE_URL = parsed.DATABASE_URL;
      source = file;
      break;
    }
  }
}
if (!process.env.DATABASE_URL) {
  bad("DATABASE_URL is not set in the shell, .env.local or .env");
  process.exit(1);
}
ok(`using ${source}`);
for (const file of [".env.local", ".env"]) {
  if (file === source || !fs.existsSync(file)) continue;
  const other = dotenv.parse(fs.readFileSync(file)).DATABASE_URL;
  if (other && other !== process.env.DATABASE_URL) {
    bad(`${file} ALSO defines a different DATABASE_URL — the app and the Prisma CLI may be using different databases`);
  }
}

// ── 2. URL sanity
step(2, "Is the URL well-formed?");
let url;
try {
  url = new URL(process.env.DATABASE_URL);
} catch {
  bad("DATABASE_URL can't be parsed. Special characters in the password (@ # / : ? %) must be URL-encoded.");
  process.exit(1);
}
const host = url.hostname;
const port = Number(url.port || 5432);
ok(`host ${host}  port ${port}  db ${url.pathname.slice(1) || "(none)"}  user ${decodeURIComponent(url.username)}  password ${url.password ? "(set)" : "(MISSING)"}`);
if (!url.password) bad("no password in the URL");
if (port === 6543 && url.searchParams.get("pgbouncer") !== "true") {
  bad("port 6543 is Supabase's transaction pooler — the URL should end with ?pgbouncer=true for Prisma");
}

// ── 3. DNS
step(3, "DNS lookup");
try {
  const addrs = await dns.lookup(host, { all: true });
  ok(addrs.map((a) => a.address).join(", "));
} catch (e) {
  bad(`can't resolve ${host} (${e.code}). Check your internet connection / DNS / VPN.`);
  process.exit(1);
}

// ── 4. Raw TCP
step(4, `TCP connect to ${host}:${port} (8s timeout)`);
const tcp = await new Promise((resolve) => {
  const started = Date.now();
  const socket = net.connect({ host, port, timeout: 8000 });
  socket.once("connect", () => { socket.destroy(); resolve({ ok: true, ms: Date.now() - started }); });
  socket.once("timeout", () => { socket.destroy(); resolve({ ok: false, why: "timed out" }); });
  socket.once("error", (e) => resolve({ ok: false, why: e.code || e.message }));
});
if (tcp.ok) {
  ok(`connected in ${tcp.ms} ms`);
} else {
  bad(`could not connect (${tcp.why})`);
  info("The network path to the database is blocked or the database is down. Check, in order:");
  info("  1. Supabase dashboard — is the project 'Paused'? Click Restore and wait a few minutes.");
  info("  2. Try a phone hotspot — some ISPs / school / office networks / VPNs block ports 5432 and 6543.");
  info("  3. Try port 5432 on the same host (session pooler) in DATABASE_URL.");
  info("This is NOT a code problem: the app never got as far as talking to Postgres.");
  process.exit(1);
}

// ── 5. Real query through Prisma
step(5, "Prisma query");
const prisma = new PrismaClient({ log: [] });
try {
  await prisma.$queryRaw`SELECT 1`;
  ok("SELECT 1 succeeded");
  const users = await prisma.user.count();
  ok(`User table reachable (${users} users)`);
  console.log("\nDatabase connection is healthy. If the app still fails, restart `npm run dev` and send me the new error.\n");
} catch (e) {
  bad(String(e.message).split("\n").filter(Boolean).slice(-2).join(" "));
  info("TCP works but Prisma failed: usually wrong password/user ('Tenant or user not found'), a missing ?pgbouncer=true on 6543, or tables not created yet (run `npx prisma migrate deploy`).");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
