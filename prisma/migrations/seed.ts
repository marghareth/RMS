// ─── SEED FILE ─────────────────────────────────────────────────────────────────
// Run with:  npx tsx prisma/migrations/seed.ts
// Or add to package.json:
//   "prisma": { "seed": "npx tsx prisma/migrations/seed.ts" }
// Then run:  npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Default Admin User ──────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const hash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        username:      "admin",
        password_hash: hash,
        role:          "ADMIN",
        is_active:     true,
      },
    });
    console.log("✅ Created admin user  (username: admin / password: admin123)");
  } else {
    console.log("ℹ️  Admin user already exists — skipping.");
  }

  // ── Default Puroks ──────────────────────────────────────────────────────────
  const puroks = ["Purok I", "Purok II", "Purok III", "Purok IV", "Purok V"];
  for (const name of puroks) {
    await prisma.purok.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Seeded puroks:", puroks.join(", "));

  // ── System Settings ─────────────────────────────────────────────────────────
  const settings = [
    { key: "barangay_name",  value: "Brgy. Quisol"        },
    { key: "municipality",   value: "Danao City"           },
    { key: "province",       value: "Cebu"                 },
    { key: "region",         value: "Region VII"           },
    { key: "zip_code",       value: "6004"                 },
    { key: "contact_number", value: "0917-000-0000"        },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where:  { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("✅ Seeded system settings");

  console.log("\n🎉 Seed complete.");
  console.log("   Login at /login with username: admin  password: admin123");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());