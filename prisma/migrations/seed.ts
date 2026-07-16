// ─── SEED FILE ─────────────────────────────────────────────────────────────────
// Run with:  npm run db:seed
// Or:        npx tsx prisma/migrations/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function monthsAgo(n: number) { const d = new Date(); d.setMonth(d.getMonth() - n); return d; }
function yearsAgo(n: number) { const d = new Date(); d.setFullYear(d.getFullYear() - n); return d; }
function dob(age: number) { return yearsAgo(age); }

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database...\n");

  // ── 1. USERS ────────────────────────────────────────────────────────────────
  console.log("👤 Creating users...");
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const [admin, captain, secretary, kagawad, bhw, encoder] = await Promise.all([
    prisma.user.upsert({ where: { username: "admin"     }, update: {}, create: { username: "admin",     password_hash: await hash("admin123"),     role: "ADMIN",     is_active: true } }),
    prisma.user.upsert({ where: { username: "captain"   }, update: {}, create: { username: "captain",   password_hash: await hash("captain123"),   role: "CAPTAIN",   is_active: true } }),
    prisma.user.upsert({ where: { username: "secretary" }, update: {}, create: { username: "secretary", password_hash: await hash("secretary123"), role: "SECRETARY", is_active: true } }),
    prisma.user.upsert({ where: { username: "kagawad1"  }, update: {}, create: { username: "kagawad1",  password_hash: await hash("kagawad123"),   role: "KAGAWAD",   is_active: true } }),
    prisma.user.upsert({ where: { username: "bhw1"      }, update: {}, create: { username: "bhw1",      password_hash: await hash("bhw123"),       role: "BHW",       is_active: true } }),
    prisma.user.upsert({ where: { username: "encoder1"  }, update: {}, create: { username: "encoder1",  password_hash: await hash("encoder123"),   role: "ENCODER",   is_active: true } }),
  ]);

  console.log("  ✅ 6 users created");
  console.log("     admin / admin123");
  console.log("     captain / captain123");
  console.log("     secretary / secretary123");
  console.log("     kagawad1 / kagawad123");
  console.log("     bhw1 / bhw123");
  console.log("     encoder1 / encoder123");

  // ── 2. PUROKS ───────────────────────────────────────────────────────────────
  console.log("\n📍 Creating puroks...");
  const purokNames = ["Purok I", "Purok II", "Purok III", "Purok IV", "Purok V"];
  const puroks = await Promise.all(
    purokNames.map(name =>
      prisma.purok.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const [p1, p2, p3, p4, p5] = puroks;
  console.log(`  ✅ ${puroks.length} puroks created`);

  // ── 3. HOUSEHOLDS ───────────────────────────────────────────────────────────
  console.log("\n🏠 Creating households...");

  const households = await Promise.all([
    prisma.household.upsert({ where: { household_no: "HHNP100000001" }, update: {}, create: { household_no: "HHNP100000001", purok_id: p1.id, address: "Blk 1 Lot 3, Sampaguita St.", housing_type: "OWN",    water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000002" }, update: {}, create: { household_no: "HHNP100000002", purok_id: p1.id, address: "Blk 2 Lot 7, Mabini St.",    housing_type: "OWN",    water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000003" }, update: {}, create: { household_no: "HHNP100000003", purok_id: p2.id, address: "Zone 4, San Vicente",         housing_type: "RENT",   water_source: "COMMUNAL",   comfort_room: "SHARED" } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000004" }, update: {}, create: { household_no: "HHNP100000004", purok_id: p2.id, address: "Poblacion, Barangay Hall Rd", housing_type: "OWN",    water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000005" }, update: {}, create: { household_no: "HHNP100000005", purok_id: p3.id, address: "Sitio Kanipaan",               housing_type: "OWN",    water_source: "WELL",       comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000006" }, update: {}, create: { household_no: "HHNP100000006", purok_id: p3.id, address: "Blk 5, Rizal Avenue",          housing_type: "SHARED", water_source: "COMMUNAL",   comfort_room: "SHARED" } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000007" }, update: {}, create: { household_no: "HHNP100000007", purok_id: p4.id, address: "Sitio Tabunok, Upper",         housing_type: "OWN",    water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000008" }, update: {}, create: { household_no: "HHNP100000008", purok_id: p4.id, address: "Corner Quezon & Osmena St.",   housing_type: "RENT",   water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000009" }, update: {}, create: { household_no: "HHNP100000009", purok_id: p5.id, address: "Sitio Lower Quisol",           housing_type: "OWN",    water_source: "WELL",       comfort_room: "NONE"   } }),
    prisma.household.upsert({ where: { household_no: "HHNP100000010" }, update: {}, create: { household_no: "HHNP100000010", purok_id: p5.id, address: "Blk 9 Lot 1, Maharlika St.",  housing_type: "OWN",    water_source: "INDIVIDUAL", comfort_room: "OWN"    } }),
  ]);

  const [hh1, hh2, hh3, hh4, hh5, hh6, hh7, hh8, hh9, hh10] = households;
  console.log(`  ✅ ${households.length} households created`);

  // ── 4. RESIDENTS ────────────────────────────────────────────────────────────
  console.log("\n👥 Creating residents...");

  // Helper to find or create a resident by fname+lname+birthdate
  async function upsertResident(data: Record<string, any>) {
    const existing = await prisma.resident.findFirst({
      where: { fname: data.fname as string, lname: data.lname as string, birthdate: data.birthdate as Date },
    });
    if (existing) return existing;
    return prisma.resident.create({ data });
  }

  const residents = await Promise.all([
    // HH1 — Dela Cruz family, Purok I
    upsertResident({ household_id: hh1.id, purok_id: p1.id, fname: "Maria",      lname: "Dela Cruz",   mname: "Santos",      sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(36), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "COLLEGE GRAD.", occupation: "Teacher",    income_bracket: "10K_20K",  sector: "N/A"    }),
    upsertResident({ household_id: hh1.id, purok_id: p1.id, fname: "Ricardo",    lname: "Dela Cruz",   mname: "Manalo",      sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(40), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "COLLEGE GRAD.", occupation: "Engineer",   income_bracket: "20K_40K",  sector: "N/A"    }),
    upsertResident({ household_id: hh1.id, purok_id: p1.id, fname: "Kristine",   lname: "Dela Cruz",   mname: "Santos",      sex: "FEMALE", civil_status: "SINGLE",    birthdate: dob(16), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "STUDENT",    educational_attainment: "HIGH SCHOOL",   occupation: "Student",    income_bracket: "BELOW_5K", sector: "YOUTH"  }),
    // HH2 — Santos family, Purok I
    upsertResident({ household_id: hh2.id, purok_id: p1.id, fname: "Juan",       lname: "Santos",      mname: "Reyes",       sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(45), place_of_birth: "Cebu City, Cebu",      citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "COLLEGE GRAD.", occupation: "Police",     income_bracket: "20K_40K",  sector: "N/A"    }),
    upsertResident({ household_id: hh2.id, purok_id: p1.id, fname: "Lourdes",    lname: "Santos",      mname: "Flores",      sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(42), place_of_birth: "Mandaue City, Cebu",   citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "UNEMPLOYED", educational_attainment: "HIGH SCHOOL",   occupation: "Housewife",  income_bracket: "BELOW_5K", sector: "N/A"    }),
    upsertResident({ household_id: hh2.id, purok_id: p1.id, fname: "Jericho",    lname: "Santos",      mname: "Reyes",       sex: "MALE",   civil_status: "SINGLE",    birthdate: dob(8),  place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "STUDENT",    educational_attainment: "ELEM.",         occupation: "Student",    income_bracket: "BELOW_5K", sector: "YOUTH"  }),
    // HH3 — Lopez family, Purok II
    upsertResident({ household_id: hh3.id, purok_id: p2.id, fname: "Ana",        lname: "Lopez",       mname: "Tan",         name_extension: "Jr.", sex: "FEMALE", civil_status: "SINGLE",  birthdate: dob(28), place_of_birth: "Danao City, Cebu",   citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "COLLEGE GRAD.", occupation: "Nurse",      income_bracket: "10K_20K",  sector: "N/A"    }),
    // HH4 — Garcia family, Purok II (senior citizen)
    upsertResident({ household_id: hh4.id, purok_id: p2.id, fname: "Domingo",    lname: "Garcia",      mname: "Cruz",        sex: "MALE",   civil_status: "WIDOWED",   birthdate: dob(68), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "RETIRED",    educational_attainment: "ELEM.",         occupation: "Retired",    income_bracket: "BELOW_5K", sector: "SENIOR" }),
    upsertResident({ household_id: hh4.id, purok_id: p2.id, fname: "Carmen",     lname: "Garcia",      mname: "Villanueva",  sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(38), place_of_birth: "Cebu City, Cebu",      citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "HIGH SCHOOL",   occupation: "Vendor",     income_bracket: "5K_10K",   sector: "N/A"    }),
    // HH5 — Reyes family, Purok III (prenatal)
    upsertResident({ household_id: hh5.id, purok_id: p3.id, fname: "Rosa",       lname: "Reyes",       mname: "Buenaventura",sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(26), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "UNEMPLOYED", educational_attainment: "HIGH SCHOOL",   occupation: "Housewife",  income_bracket: "BELOW_5K", sector: "N/A"    }),
    upsertResident({ household_id: hh5.id, purok_id: p3.id, fname: "Ronaldo",    lname: "Reyes",       mname: "Magbanua",    sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(30), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "HIGH SCHOOL",   occupation: "Farmer",     income_bracket: "5K_10K",   sector: "N/A"    }),
    // HH6 — Cruz family, Purok III (PWD)
    upsertResident({ household_id: hh6.id, purok_id: p3.id, fname: "Fernando",   lname: "Cruz",        mname: "Aguirre",     sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(35), place_of_birth: "Cebu City, Cebu",      citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "UNEMPLOYED", educational_attainment: "HIGH SCHOOL",   occupation: "Unemployed", income_bracket: "BELOW_5K", sector: "PWD"    }),
    upsertResident({ household_id: hh6.id, purok_id: p3.id, fname: "Myrna",      lname: "Cruz",        mname: "Abellanosa",  sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(32), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "VOCATIONAL",    occupation: "Dressmaker", income_bracket: "5K_10K",   sector: "N/A"    }),
    // HH7 — Mendoza family, Purok IV (4Ps)
    upsertResident({ household_id: hh7.id, purok_id: p4.id, fname: "Lito",       lname: "Mendoza",     mname: "Sabio",       sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(44), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "ELEM.",         occupation: "Farmer",     income_bracket: "BELOW_5K", sector: "4PS"    }),
    upsertResident({ household_id: hh7.id, purok_id: p4.id, fname: "Melinda",    lname: "Mendoza",     mname: "Estabillo",   sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(41), place_of_birth: "Compostela, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "UNEMPLOYED", educational_attainment: "ELEM.",         occupation: "Housewife",  income_bracket: "BELOW_5K", sector: "4PS"    }),
    upsertResident({ household_id: hh7.id, purok_id: p4.id, fname: "Nino",       lname: "Mendoza",     mname: "Sabio",       sex: "MALE",   civil_status: "SINGLE",    birthdate: dob(5),  place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "STUDENT",    educational_attainment: "ELEM.",         occupation: "Student",    income_bracket: "BELOW_5K", sector: "YOUTH"  }),
    // HH8 — Aquino family, Purok IV
    upsertResident({ household_id: hh8.id, purok_id: p4.id, fname: "Roberto",    lname: "Aquino",      mname: "Camay",       sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(50), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "HIGH SCHOOL",   occupation: "Tricycle Driver", income_bracket: "5K_10K", sector: "N/A" }),
    // HH9 — Ramos family, Purok V (senior + PWD)
    upsertResident({ household_id: hh9.id, purok_id: p5.id, fname: "Teresa",     lname: "Ramos",       mname: "Dela Pena",   sex: "FEMALE", civil_status: "WIDOWED",   birthdate: dob(72), place_of_birth: "Liloan, Cebu",         citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "RETIRED",    educational_attainment: "ELEM.",         occupation: "Retired",    income_bracket: "BELOW_5K", sector: "SENIOR" }),
    upsertResident({ household_id: hh9.id, purok_id: p5.id, fname: "Efren",      lname: "Ramos",       mname: "Dela Pena",   sex: "MALE",   civil_status: "SINGLE",    birthdate: dob(48), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "UNEMPLOYED", educational_attainment: "HIGH SCHOOL",   occupation: "Unemployed", income_bracket: "BELOW_5K", sector: "PWD"    }),
    // HH10 — Villanueva family, Purok V
    upsertResident({ household_id: hh10.id, purok_id: p5.id, fname: "Eduardo",   lname: "Villanueva",  mname: "Ponce",       sex: "MALE",   civil_status: "MARRIED",   birthdate: dob(55), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "EMPLOYED",   educational_attainment: "HIGH SCHOOL",   occupation: "Carpenter",  income_bracket: "5K_10K",   sector: "N/A"    }),
    upsertResident({ household_id: hh10.id, purok_id: p5.id, fname: "Natividad", lname: "Villanueva",  mname: "Torres",      sex: "FEMALE", civil_status: "MARRIED",   birthdate: dob(62), place_of_birth: "Danao City, Cebu",     citizenship: "Filipino", religion: "Roman Catholic", nationality: "Filipino", employment_status: "RETIRED",    educational_attainment: "ELEM.",         occupation: "Retired",    income_bracket: "BELOW_5K", sector: "SENIOR" }),
  ]);

  const [
    mariaDC, ricardoDC, kristineDC,
    juanS, lourdesS, jerichoS,
    anaL,
    domingoG, carmenG,
    rosaR, ronaldoR,
    fernandoC, myrnaC,
    litoM, melindaM, ninoM,
    robertoA,
    teresaRa, efrenRa,
    eduardoV, natividadV,
  ] = residents;

  // Set household heads
  await Promise.all([
    prisma.household.update({ where: { id: hh1.id  }, data: { household_head_id: mariaDC.id    } }),
    prisma.household.update({ where: { id: hh2.id  }, data: { household_head_id: juanS.id      } }),
    prisma.household.update({ where: { id: hh3.id  }, data: { household_head_id: anaL.id       } }),
    prisma.household.update({ where: { id: hh4.id  }, data: { household_head_id: domingoG.id   } }),
    prisma.household.update({ where: { id: hh5.id  }, data: { household_head_id: ronaldoR.id   } }),
    prisma.household.update({ where: { id: hh6.id  }, data: { household_head_id: fernandoC.id  } }),
    prisma.household.update({ where: { id: hh7.id  }, data: { household_head_id: litoM.id      } }),
    prisma.household.update({ where: { id: hh8.id  }, data: { household_head_id: robertoA.id   } }),
    prisma.household.update({ where: { id: hh9.id  }, data: { household_head_id: efrenRa.id    } }),
    prisma.household.update({ where: { id: hh10.id }, data: { household_head_id: eduardoV.id   } }),
  ]);

  console.log(`  ✅ ${residents.length} residents created`);

  // ── 5. BARANGAY OFFICIALS ───────────────────────────────────────────────────
  console.log("\n🏛️  Creating barangay officials...");

  const officialData = [
    { resident_id: ricardoDC.id, position: "Barangay Captain",    contact_no: "09171234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: mariaDC.id,   position: "Barangay Secretary",  contact_no: "09181234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: juanS.id,     position: "Sangguniang Kagawad", contact_no: "09191234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: carmenG.id,   position: "Sangguniang Kagawad", contact_no: "09201234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: ronaldoR.id,  position: "Sangguniang Kagawad", contact_no: "09211234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: robertoA.id,  position: "SK Chairman",         contact_no: "09221234567", term_start: new Date("2023-01-01"), is_active: true  },
    { resident_id: eduardoV.id,  position: "Barangay Treasurer",  contact_no: "09231234567", term_start: new Date("2023-01-01"), is_active: true  },
  ];

  for (const o of officialData) {
    const exists = await prisma.brgyOfficial.findUnique({ where: { resident_id: o.resident_id } });
    if (!exists) await prisma.brgyOfficial.create({ data: o });
  }
  console.log(`  ✅ ${officialData.length} officials created`);

  // ── 6. CERTIFICATES ─────────────────────────────────────────────────────────
  console.log("\n📜 Creating certificates...");

  const certData = [
    { resident_id: mariaDC.id,  issued_by: secretary.id, certificate_type: "RESIDENCY"           , purpose: "Employment requirement",       issued_at: daysAgo(5)  },
    { resident_id: juanS.id,    issued_by: secretary.id, certificate_type: "CLEARANCE"            , purpose: "NBI application",               issued_at: daysAgo(8)  },
    { resident_id: anaL.id,     issued_by: secretary.id, certificate_type: "GOOD_MORAL"           , purpose: "Scholarship application",       issued_at: daysAgo(10) },
    { resident_id: domingoG.id, issued_by: encoder.id,   certificate_type: "INDIGENCY"            , purpose: "Medical assistance",            issued_at: daysAgo(15) },
    { resident_id: rosaR.id,    issued_by: secretary.id, certificate_type: "RESIDENCY"            , purpose: "PhilHealth registration",        issued_at: daysAgo(18) },
    { resident_id: fernandoC.id,issued_by: encoder.id,   certificate_type: "INDIGENCY"            , purpose: "DSWD assistance",               issued_at: daysAgo(20) },
    { resident_id: litoM.id,    issued_by: secretary.id, certificate_type: "RESIDENCY"            , purpose: "Government ID application",     issued_at: daysAgo(22) },
    { resident_id: carmenG.id,  issued_by: encoder.id,   certificate_type: "BUSINESS_PERMIT"      , purpose: "Sari-sari store permit renewal", issued_at: daysAgo(25) },
    { resident_id: robertoA.id, issued_by: secretary.id, certificate_type: "RESIDENCY"            , purpose: "Bank account opening",          issued_at: monthsAgo(2) },
    { resident_id: eduardoV.id, issued_by: encoder.id,   certificate_type: "CLEARANCE"            , purpose: "Employment",                    issued_at: monthsAgo(2) },
    { resident_id: kristineDC.id,issued_by: encoder.id,  certificate_type: "FIRST_TIME_JOB_SEEKER", purpose: "DOLE requirement",              issued_at: monthsAgo(1) },
    { resident_id: mariaDC.id,  issued_by: secretary.id, certificate_type: "RESIDENCY"            , purpose: "SSS loan requirement",          issued_at: monthsAgo(3) },
  ];

  for (const c of certData) {
    await prisma.certificate.create({ data: c });
  }
  console.log(`  ✅ ${certData.length} certificates created`);

  // ── 7. BLOTTER CASES ────────────────────────────────────────────────────────
  console.log("\n🚔 Creating blotter cases...");

  const blotter1 = await prisma.blotterCase.upsert({
    where: { case_number: "BLT-2026-0001" },
    update: {},
    create: {
      case_number:         "BLT-2026-0001",
      complainant_id:      juanS.id,
      complainant_name:    "Juan Santos",
      complainant_contact: "09191234567",
      complainant_address: "Blk 2 Lot 7, Mabini St., Purok I",
      respondent_id:       fernandoC.id,
      respondent_name:     "Fernando Cruz",
      incident_narrative:  "Complainant alleges that respondent caused physical harm during a dispute over property boundary along their shared fence. Incident occurred at approximately 3PM.",
      incident_date:       daysAgo(20),
      hearing_date:        daysAgo(17),
      status:              "RESOLVED",
      escalated:           false,
    },
  });

  await prisma.blotterUpdate.createMany({ data: [
    { blotter_case_id: blotter1.id, updated_by: secretary.id, notes: "Both parties appeared. Mediation conducted.",                      new_status: "ONGOING",   updated_at: daysAgo(17) },
    { blotter_case_id: blotter1.id, updated_by: secretary.id, notes: "Parties reached amicable settlement. Respondent issued apology.", new_status: "RESOLVED",  updated_at: daysAgo(14) },
  ]});

  const blotter2 = await prisma.blotterCase.upsert({
    where: { case_number: "BLT-2026-0002" },
    update: {},
    create: {
      case_number:         "BLT-2026-0002",
      complainant_id:      mariaDC.id,
      complainant_name:    "Maria Dela Cruz",
      complainant_contact: "09171234567",
      complainant_address: "Blk 1 Lot 3, Sampaguita St., Purok I",
      respondent_id:       null,
      respondent_name:     "Unknown Person",
      incident_narrative:  "Complainant reported theft of personal items including a mobile phone and cash amounting to Php 2,500 from her residence. Entry was made through an unlocked window.",
      incident_date:       daysAgo(10),
      hearing_date:        daysAgo(7),
      status:              "ONGOING",
      escalated:           true,
    },
  });

  await prisma.blotterUpdate.create({ data: {
    blotter_case_id: blotter2.id, updated_by: secretary.id,
    notes: "Case escalated to PNP Danao City for further investigation due to unidentified respondent.",
    new_status: "ONGOING", updated_at: daysAgo(7),
  }});

  const blotter3 = await prisma.blotterCase.upsert({
    where: { case_number: "BLT-2026-0003" },
    update: {},
    create: {
      case_number:         "BLT-2026-0003",
      complainant_id:      carmenG.id,
      complainant_name:    "Carmen Garcia",
      complainant_contact: "09201234567",
      complainant_address: "Poblacion, Barangay Hall Rd, Purok II",
      respondent_id:       myrnaC.id,
      respondent_name:     "Myrna Cruz",
      incident_narrative:  "Noise complaint due to loud music during late evening hours. Complainant alleges respondent has repeatedly violated curfew noise ordinance for the past month.",
      incident_date:       daysAgo(3),
      hearing_date:        daysAgo(1),
      status:              "FILED",
      escalated:           false,
    },
  });

  await prisma.blotterCase.upsert({
    where: { case_number: "BLT-2026-0004" },
    update: {},
    create: {
      case_number:         "BLT-2026-0004",
      complainant_id:      ronaldoR.id,
      complainant_name:    "Ronaldo Reyes",
      complainant_contact: "09211234567",
      complainant_address: "Sitio Kanipaan, Purok III",
      respondent_id:       robertoA.id,
      respondent_name:     "Roberto Aquino",
      incident_narrative:  "Dispute over water irrigation rights in communal farmland. Respondent allegedly blocked water flow affecting complainant's crops.",
      incident_date:       monthsAgo(2),
      hearing_date:        monthsAgo(2),
      status:              "DISMISSED",
      escalated:           false,
    },
  });

  console.log("  ✅ 4 blotter cases created");

  // ── 8. SPECIAL REGISTRIES ───────────────────────────────────────────────────
  console.log("\n📋 Creating special registries...");

  const registries = [
    { resident_id: domingoG.id,   registry_type: "SENIOR_CITIZEN", registered_at: yearsAgo(2)   },
    { resident_id: teresaRa.id,   registry_type: "SENIOR_CITIZEN", registered_at: yearsAgo(3)   },
    { resident_id: natividadV.id, registry_type: "SENIOR_CITIZEN", registered_at: yearsAgo(1)   },
    { resident_id: fernandoC.id,  registry_type: "PWD"           , disability_type: "Physical Disability",  registered_at: yearsAgo(2) },
    { resident_id: efrenRa.id,    registry_type: "PWD"           , disability_type: "Visual Impairment",    registered_at: yearsAgo(1) },
    { resident_id: litoM.id,      registry_type: "FOUR_PS"       , is_4ps_beneficiary: true, registered_at: yearsAgo(3) },
    { resident_id: melindaM.id,   registry_type: "FOUR_PS"       , is_4ps_beneficiary: true, registered_at: yearsAgo(3) },
    { resident_id: ninoM.id,      registry_type: "FOUR_PS"       , is_4ps_beneficiary: true, registered_at: yearsAgo(3) },
  ];

  for (const r of registries) {
    const exists = await prisma.specialRegistry.findFirst({ where: { resident_id: r.resident_id, registry_type: r.registry_type } });
    if (!exists) await prisma.specialRegistry.create({ data: r });
  }
  console.log(`  ✅ ${registries.length} registry entries created`);

  // ── 9. HEALTH RECORDS ───────────────────────────────────────────────────────
  console.log("\n🏥 Creating health records...");

  const healthRecords = [
    { resident_id: domingoG.id,  record_type: "Hypertension",       notes: "BP: 150/95. Medications adjusted. Advised low sodium diet.",                recorded_by: bhw.id, recorded_at: daysAgo(5)  },
    { resident_id: teresaRa.id,  record_type: "Diabetes",           notes: "Blood sugar: 185 mg/dL. On Metformin 500mg twice daily.",                  recorded_by: bhw.id, recorded_at: daysAgo(8)  },
    { resident_id: rosaR.id,     record_type: "Prenatal Checkup",   notes: "28 weeks AOG. Fetal heart rate normal at 144 bpm. Iron supplements given.", recorded_by: bhw.id, recorded_at: daysAgo(10) },
    { resident_id: fernandoC.id, record_type: "Tuberculosis",       notes: "DOTS therapy Month 3 of 6. Patient compliant. Sputum negative.",           recorded_by: bhw.id, recorded_at: daysAgo(12) },
    { resident_id: ninoM.id,     record_type: "Well-child Checkup", notes: "Age 5. Weight 18kg, Height 109cm. Growth on track. Vitamin A given.",      recorded_by: bhw.id, recorded_at: daysAgo(15) },
    { resident_id: carmenG.id,   record_type: "Hypertension",       notes: "BP: 140/90. Referred to RHU for further evaluation.",                      recorded_by: bhw.id, recorded_at: daysAgo(20) },
    { resident_id: melindaM.id,  record_type: "Family Planning",    notes: "Counseling completed. Opted for pills. 3 months supply given.",             recorded_by: bhw.id, recorded_at: daysAgo(25) },
    { resident_id: jerichoS.id,  record_type: "Well-child Checkup", notes: "Age 8. Weight 25kg, Height 128cm. All vaccines up to date.",               recorded_by: bhw.id, recorded_at: monthsAgo(1) },
    { resident_id: natividadV.id,record_type: "Hypertension",       notes: "BP: 160/100. High. Referral letter to Danao City Hospital issued.",        recorded_by: bhw.id, recorded_at: monthsAgo(1) },
  ];

  for (const h of healthRecords) {
    await prisma.healthRecord.create({ data: h });
  }
  console.log(`  ✅ ${healthRecords.length} health records created`);

  // ── 10. VACCINATIONS ────────────────────────────────────────────────────────
  console.log("\n💉 Creating vaccination records...");

  const vaccinationData = [
    { resident_id: ninoM.id,    vaccine_name: "BCG",                 date_given: yearsAgo(4),    recorded_by: bhw.id },
    { resident_id: ninoM.id,    vaccine_name: "DPT (1st dose)",      date_given: yearsAgo(4),    recorded_by: bhw.id },
    { resident_id: ninoM.id,    vaccine_name: "DPT (2nd dose)",      date_given: yearsAgo(4),    recorded_by: bhw.id },
    { resident_id: ninoM.id,    vaccine_name: "MMR",                  date_given: yearsAgo(3),    recorded_by: bhw.id },
    { resident_id: jerichoS.id, vaccine_name: "BCG",                 date_given: yearsAgo(7),    recorded_by: bhw.id },
    { resident_id: jerichoS.id, vaccine_name: "MMR",                  date_given: yearsAgo(6),    recorded_by: bhw.id },
    { resident_id: mariaDC.id,  vaccine_name: "COVID-19 (1st dose)", date_given: yearsAgo(3),    recorded_by: bhw.id },
    { resident_id: mariaDC.id,  vaccine_name: "COVID-19 (2nd dose)", date_given: monthsAgo(30),  recorded_by: bhw.id },
    { resident_id: mariaDC.id,  vaccine_name: "COVID-19 Booster",    date_given: monthsAgo(18),  recorded_by: bhw.id },
    { resident_id: juanS.id,    vaccine_name: "COVID-19 (1st dose)", date_given: yearsAgo(3),    recorded_by: bhw.id },
    { resident_id: juanS.id,    vaccine_name: "COVID-19 (2nd dose)", date_given: monthsAgo(30),  recorded_by: bhw.id },
    { resident_id: rosaR.id,    vaccine_name: "Tetanus Toxoid",       date_given: daysAgo(15),    recorded_by: bhw.id },
    { resident_id: domingoG.id, vaccine_name: "Influenza",            date_given: monthsAgo(6),   recorded_by: bhw.id },
    { resident_id: teresaRa.id, vaccine_name: "Influenza",            date_given: monthsAgo(6),   recorded_by: bhw.id },
    { resident_id: anaL.id,     vaccine_name: "Hepatitis B (1st)",    date_given: monthsAgo(4),   recorded_by: bhw.id },
    { resident_id: anaL.id,     vaccine_name: "Hepatitis B (2nd)",    date_given: monthsAgo(2),   recorded_by: bhw.id },
  ];

  for (const v of vaccinationData) {
    await prisma.vaccination.create({ data: v });
  }
  console.log(`  ✅ ${vaccinationData.length} vaccination records created`);

  // ── 11. EQUIPMENT ───────────────────────────────────────────────────────────
  console.log("\n📦 Creating equipment...");

  const equipmentList = [
    { name: "Megaphone",         quantity: 3, condition: "Good",         status: "SERVICEABLE"  , date_acquired: yearsAgo(4)  },
    { name: "Plastic Chairs",    quantity: 50,condition: "Fair",         status: "SERVICEABLE"  , date_acquired: yearsAgo(5)  },
    { name: "Folding Tables",    quantity: 10,condition: "Good",         status: "SERVICEABLE"  , date_acquired: yearsAgo(5)  },
    { name: "Generator",         quantity: 1, condition: "Needs repair", status: "UNSERVICEABLE", date_acquired: yearsAgo(7)  },
    { name: "Tarpaulin Stand",   quantity: 4, condition: "Good",         status: "SERVICEABLE"  , date_acquired: yearsAgo(3)  },
    { name: "Sound System",      quantity: 1, condition: "Good",         status: "SERVICEABLE"  , date_acquired: yearsAgo(4)  },
    { name: "First Aid Kit",     quantity: 5, condition: "Complete",     status: "SERVICEABLE"  , date_acquired: yearsAgo(2)  },
    { name: "Basketball Ring",   quantity: 2, condition: "Damaged",      status: "MISSING"      , date_acquired: yearsAgo(6)  },
  ];

  const createdEquipment: Array<{ id: number; name: string; [key: string]: any }> = [];
  for (const e of equipmentList) {
    const existing = await prisma.equipment.findFirst({ where: { name: e.name } });
    const eq = existing ?? await prisma.equipment.create({ data: e });
    createdEquipment.push(eq as { id: number; name: string; [key: string]: any });
  }
  const [megaphone, chairs, tables, generator, tarpStand, soundSystem, firstAid] = createdEquipment;
  console.log(`  ✅ ${createdEquipment.length} equipment items created`);

  // Equipment borrowings
  const borrowings = [
    { equipment_id: megaphone.id,   resident_id: juanS.id,    borrower_name: "Juan Santos",        date_borrowed: daysAgo(15), expected_return: daysAgo(10), actual_return: daysAgo(10), return_condition: "Good",  is_overdue: false, recorded_by: secretary.id },
    { equipment_id: chairs.id,      resident_id: mariaDC.id,  borrower_name: "Maria Dela Cruz",    date_borrowed: daysAgo(5),  expected_return: daysAgo(2),  actual_return: null,         return_condition: null,    is_overdue: true,  recorded_by: encoder.id   },
    { equipment_id: soundSystem.id, resident_id: carmenG.id,  borrower_name: "Carmen Garcia",      date_borrowed: daysAgo(3),  expected_return: daysAgo(1),  actual_return: null,         return_condition: null,    is_overdue: true,  recorded_by: encoder.id   },
    { equipment_id: tarpStand.id,   resident_id: ronaldoR.id, borrower_name: "Ronaldo Reyes",      date_borrowed: daysAgo(1),  expected_return: daysAgo(-3), actual_return: null,         return_condition: null,    is_overdue: false, recorded_by: secretary.id },
  ];

  for (const b of borrowings) {
    await prisma.equipmentBorrowing.create({ data: b });
  }
  console.log(`  ✅ ${borrowings.length} equipment borrowings created`);

  // ── 12. FINANCIAL RECORDS ───────────────────────────────────────────────────
  console.log("\n💰 Creating financial records...");

  const financialData = [
    { transaction_type: "INCOME" , amount: 125000, description: "Tax collection – June 2026",          transaction_date: daysAgo(10), recorded_by: secretary.id },
    { transaction_type: "INCOME" , amount: 9500,   description: "Certificate fees – June 2026",        transaction_date: daysAgo(10), recorded_by: encoder.id   },
    { transaction_type: "INCOME" , amount: 14500,  description: "Market stall fees – June 2026",       transaction_date: daysAgo(12), recorded_by: secretary.id },
    { transaction_type: "INCOME" , amount: 3500,   description: "Business permit fees – June 2026",    transaction_date: daysAgo(15), recorded_by: encoder.id   },
    { transaction_type: "EXPENSE", amount: 8500,   description: "Office supplies – June 2026",         transaction_date: daysAgo(8),  recorded_by: secretary.id },
    { transaction_type: "EXPENSE", amount: 15000,  description: "Barangay assembly program expenses",  transaction_date: daysAgo(20), recorded_by: secretary.id },
    { transaction_type: "EXPENSE", amount: 6800,   description: "Electric bill – June 2026",           transaction_date: daysAgo(18), recorded_by: encoder.id   },
    { transaction_type: "EXPENSE", amount: 12000,  description: "Covered court maintenance",           transaction_date: daysAgo(25), recorded_by: secretary.id },
    { transaction_type: "INCOME" , amount: 82000,  description: "Tax collection – May 2026",           transaction_date: monthsAgo(1), recorded_by: secretary.id },
    { transaction_type: "EXPENSE", amount: 55000,  description: "Personnel services – May 2026",       transaction_date: monthsAgo(1), recorded_by: secretary.id },
    { transaction_type: "INCOME" , amount: 75000,  description: "Tax collection – April 2026",         transaction_date: monthsAgo(2), recorded_by: secretary.id },
    { transaction_type: "EXPENSE", amount: 48000,  description: "Personnel services – April 2026",     transaction_date: monthsAgo(2), recorded_by: secretary.id },
  ];

  for (const f of financialData) {
    await prisma.financialRecord.create({ data: f });
  }
  console.log(`  ✅ ${financialData.length} financial records created`);

  // ── 13. MEETINGS ────────────────────────────────────────────────────────────
  console.log("\n📅 Creating meeting records...");

  const meetings = [
    {
      meeting_type: "BARANGAY_ASSEMBLY",
      meeting_date:  monthsAgo(1),
      recorded_by:   secretary.id,
      minutes: "Barangay assembly held at the covered court. Topics discussed: (1) Road improvement project update, (2) Solid waste management ordinance enforcement, (3) Health program for senior citizens, (4) Peace and order situation. Total attendees: 87 residents.",
    },
    {
      meeting_type: "SB_MEETING",
      meeting_date:  daysAgo(14),
      recorded_by:   secretary.id,
      minutes: "Sangguniang Barangay regular session. Resolutions passed: (1) Resolution No. 2026-001 approving supplemental budget for health programs, (2) Resolution No. 2026-002 supporting the road widening project along Barangay Hall Road.",
    },
    {
      meeting_type: "SB_MEETING",
      meeting_date:  daysAgo(7),
      recorded_by:   secretary.id,
      minutes: "Special session to address noise ordinance violations and discuss proposed amendments to the existing barangay ordinance on curfew hours for minors.",
    },
    {
      meeting_type: "BARANGAY_ASSEMBLY",
      meeting_date:  monthsAgo(4),
      recorded_by:   secretary.id,
      minutes: "First quarter assembly. Reports from all committee heads presented. Concerns raised: (1) Illegal dumping in Sitio Kanipaan, (2) Streetlight replacement needed in Purok IV.",
    },
  ];

  for (const m of meetings) {
    await prisma.meetingRecord.create({ data: m });
  }
  console.log(`  ✅ ${meetings.length} meeting records created`);

  // ── 14. BARANGAY IDs ────────────────────────────────────────────────────────
  console.log("\n🪪 Creating barangay IDs...");

  const brgyIds = [
    { resident_id: mariaDC.id,  id_number: "BRG-2026-0001", issued_date: daysAgo(30),  issued_by: encoder.id   },
    { resident_id: juanS.id,    id_number: "BRG-2026-0002", issued_date: daysAgo(28),  issued_by: encoder.id   },
    { resident_id: anaL.id,     id_number: "BRG-2026-0003", issued_date: daysAgo(25),  issued_by: secretary.id },
    { resident_id: domingoG.id, id_number: "BRG-2024-0041", issued_date: yearsAgo(2),  issued_by: secretary.id },
    { resident_id: carmenG.id,  id_number: "BRG-2025-0089", issued_date: yearsAgo(1),  issued_by: encoder.id   },
  ];

  for (const b of brgyIds) {
    const exists = await prisma.barangayId.findUnique({ where: { id_number: b.id_number } });
    if (!exists) await prisma.barangayId.create({ data: b });
  }
  console.log(`  ✅ ${brgyIds.length} barangay IDs created`);

  // ── 15. SYSTEM SETTINGS ─────────────────────────────────────────────────────
  console.log("\n⚙️  Creating system settings...");

  const settings = [
    { key: "barangay_name",    value: "Brgy. Quisol"     },
    { key: "municipality",     value: "Danao City"        },
    { key: "province",         value: "Cebu"              },
    { key: "region",           value: "Region VII"        },
    { key: "zip_code",         value: "6004"              },
    { key: "contact_number",   value: "0917-000-0000"     },
    { key: "captain_name",     value: "Ricardo Dela Cruz" },
    { key: "secretary_name",   value: "Maria Dela Cruz"   },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log(`  ✅ ${settings.length} settings configured`);

  // ── 16. AUDIT LOG SAMPLES ───────────────────────────────────────────────────
  console.log("\n📝 Creating sample audit logs...");

  const auditLogs = [
    { user_id: admin.id,     action: "CREATE", table_affected: "User",      record_id: captain.id,   details: "Created user: captain",                  performed_at: daysAgo(30) },
    { user_id: encoder.id,   action: "CREATE", table_affected: "Resident",  record_id: mariaDC.id,   details: "Created resident: Maria Dela Cruz",       performed_at: daysAgo(25) },
    { user_id: encoder.id,   action: "CREATE", table_affected: "Resident",  record_id: juanS.id,     details: "Created resident: Juan Santos",           performed_at: daysAgo(25) },
    { user_id: secretary.id, action: "CREATE", table_affected: "Certificate",record_id: 1,            details: "Issued RESIDENCY certificate",            performed_at: daysAgo(5)  },
    { user_id: secretary.id, action: "CREATE", table_affected: "BlotterCase",record_id: blotter1.id, details: "Filed blotter case BLT-2026-0001",        performed_at: daysAgo(20) },
    { user_id: secretary.id, action: "UPDATE", table_affected: "BlotterCase",record_id: blotter1.id, details: "Updated blotter status to RESOLVED",      performed_at: daysAgo(14) },
    { user_id: bhw.id,       action: "CREATE", table_affected: "HealthRecord",record_id: 1,          details: "Recorded health check: Hypertension",     performed_at: daysAgo(5)  },
    { user_id: encoder.id,   action: "CREATE", table_affected: "BarangayId", record_id: 1,           details: "Issued barangay ID: BRG-2026-0001",       performed_at: daysAgo(30) },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }
  console.log(`  ✅ ${auditLogs.length} audit log entries created`);

  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Login credentials:");
  console.log("  ┌──────────────┬──────────────────┬────────────┐");
  console.log("  │ Username     │ Password         │ Role       │");
  console.log("  ├──────────────┼──────────────────┼────────────┤");
  console.log("  │ admin        │ admin123         │ ADMIN      │");
  console.log("  │ captain      │ captain123       │ CAPTAIN    │");
  console.log("  │ secretary    │ secretary123     │ SECRETARY  │");
  console.log("  │ kagawad1     │ kagawad123       │ KAGAWAD    │");
  console.log("  │ bhw1         │ bhw123           │ BHW        │");
  console.log("  │ encoder1     │ encoder123       │ ENCODER    │");
  console.log("  └──────────────┴──────────────────┴────────────┘");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());