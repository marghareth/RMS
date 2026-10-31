// FILE: prisma/migrations/seed.ts
// ─── SEED FILE ─────────────────────────────────────────────────────────────────
//

import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────
// Change these before seeding if you like; each should stay long and random.
// Store them in a password manager — this file is the only other copy.
const ACCOUNTS = [
  { username: "admin",     role: "ADMIN",     password: "ADMIN123rms" },
  { username: "captain",   role: "CAPTAIN",   password: "CAPTAIN123rms" },
  { username: "secretary", role: "SECRETARY", password: "SECRETARY123rms" },
  { username: "kagawad1",  role: "KAGAWAD",   password: "KAGAWAD123rms" },
  { username: "bhw1",      role: "BHW",       password: "BHW123rms" },
  { username: "encoder1",  role: "ENCODER",   password: "ENCODER123rms" },
] as const;

// bcrypt cost 12: about 4x slower to brute-force than the default 10, still
// fast enough at login.
const BCRYPT_COST = 12;

// ─── DETERMINISTIC RANDOMNESS ─────────────────────────────────────────────────
// mulberry32: tiny seeded PRNG, so the same seed gives the same barangay.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261031);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const money = (min: number, max: number, step = 50) => Math.round(int(min, max) / step) * step;

// ─── DATES ────────────────────────────────────────────────────────────────────
const NOW = new Date();
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const TODAY = startOfDay(NOW);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const addMinutes = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);
const daysAgo = (n: number) => addDays(TODAY, -n);
const monthsAgo = (n: number) => new Date(TODAY.getFullYear(), TODAY.getMonth() - n, Math.min(TODAY.getDate(), 28));
const yearsAgo = (n: number) => new Date(TODAY.getFullYear() - n, TODAY.getMonth(), TODAY.getDate());
const at = (d: Date, h: number, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
function weekdayOnOrBefore(d: Date) {
  let x = startOfDay(d);
  while (isWeekend(x)) x = addDays(x, -1);
  return x;
}
/** A random office-hours moment (Mon–Fri, 8:00–16:59) between two dates. */
function officeTime(from: Date, to: Date): Date {
  const span = Math.max(0, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY));
  const day = weekdayOnOrBefore(addDays(startOfDay(from), int(0, span)));
  const d = day < startOfDay(from) ? startOfDay(from) : day;
  return at(d, int(8, 16), int(0, 59));
}
const clampPast = (d: Date) => (d > NOW ? NOW : d);
function ageOn(birthdate: Date, on: Date = NOW) {
  let age = on.getFullYear() - birthdate.getFullYear();
  const m = on.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birthdate.getDate())) age--;
  return age;
}
function birthdateForAge(age: number) {
  const d = new Date(TODAY.getFullYear() - age, int(0, 11), int(1, 28));
  // Keep the age exact: if this year's birthday hasn't come yet, they're one younger.
  return ageOn(d) === age ? d : new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
}
const SEED_START = monthsAgo(22); // oldest transactional records

// ─── NAME POOLS (fictional) ───────────────────────────────────────────────────
const SURNAMES = [
  "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Cruz", "Ramos", "Aquino", "Villanueva", "Lopez",
  "Bautista", "Gonzales", "Fernandez", "Torres", "Flores", "Rivera", "Castillo", "Navarro", "Alcantara",
  "Cabrera", "Abellana", "Cabahug", "Sanchez", "Tan", "Yap", "Lim", "Alferez", "Bacalso", "Cuizon",
  "Enriquez", "Go", "Llanos", "Montecillo", "Pepito", "Quijano", "Rosales", "Sarmiento", "Tabada",
  "Ybañez", "Zamora", "Lapitan", "Mangubat", "Bongcac", "Ompad", "Rabaya", "Cabañero", "Paras",
  "Ouano", "Dumdum", "Gabutero", "Sumalinog", "Tampus", "Ycong", "Remolador", "Lacaba", "Baguio",
] as const;
const MALE = [
  "Juan", "Jose", "Ricardo", "Roberto", "Eduardo", "Fernando", "Ronaldo", "Lito", "Efren", "Domingo",
  "Mark", "John Paul", "Christian", "Jerome", "Kenneth", "Jayson", "Rodel", "Arnel", "Ramil", "Joel",
  "Dennis", "Rogelio", "Ernesto", "Antonio", "Nestor", "Romeo", "Jericho", "Niño", "Paolo", "Miguel",
  "Gabriel", "Carlo", "Angelo", "Renz", "Kyle", "Ethan", "Lucas", "Nathan", "Vicente", "Alfredo",
] as const;
const FEMALE = [
  "Maria", "Lourdes", "Carmen", "Rosa", "Myrna", "Melinda", "Teresa", "Natividad", "Ana", "Kristine",
  "Grace", "Joy", "Jennifer", "Mary Ann", "Rowena", "Marites", "Gemma", "Cristina", "Elena", "Divina",
  "Aileen", "Rhea", "Jasmine", "Angelica", "Princess", "Nicole", "Andrea", "Sofia", "Althea", "Chloe",
  "Erlinda", "Corazon", "Remedios", "Fe", "Leonora", "Precious", "Kyla", "Bea", "Trisha", "Liza",
] as const;
const firstName = (sex: "MALE" | "FEMALE") => (sex === "MALE" ? pick(MALE) : pick(FEMALE));
const mobile = () => `09${int(15, 99)}${String(int(0, 9_999_999)).padStart(7, "0")}`;

const PUROK_NAMES = ["Purok I", "Purok II", "Purok III", "Purok IV", "Purok V"] as const;
// Uneven on purpose, so the per-purok charts aren't flat.
const HOUSEHOLDS_PER_PUROK = [18, 14, 17, 12, 19];
const STREETS: Record<string, readonly string[]> = {
  "Purok I": ["Sampaguita St.", "Mabini St.", "Rizal Ave."],
  "Purok II": ["Barangay Hall Rd.", "San Vicente St.", "Bonifacio St."],
  "Purok III": ["Sitio Kanipaan", "Sitio Lawis", "Mahogany Rd."],
  "Purok IV": ["Sitio Tabunok", "Quezon St.", "Osmeña St."],
  "Purok V": ["Sitio Lower Quisol", "Maharlika St.", "Sitio Bukid"],
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if ((await prisma.user.count()) > 0) {
    console.error("❌ This database already has users. Seed an empty database:  npm run db:reset");
    process.exit(1);
  }
  console.log("🌱 Seeding database...\n");

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  const users = await prisma.user.createManyAndReturn({
    data: await Promise.all(
      ACCOUNTS.map(async (a) => ({
        username: a.username,
        role: a.role,
        password_hash: await bcrypt.hash(a.password, BCRYPT_COST),
        is_active: true,
        created_at: monthsAgo(23),
      }))
    ),
  });
  const user = Object.fromEntries(users.map((u) => [u.username, u])) as Record<(typeof ACCOUNTS)[number]["username"], (typeof users)[number]>;
  const { admin, captain, secretary, bhw1: bhw, encoder1: encoder } = user;
  const deskStaff = [secretary.id, encoder.id] as const;
  console.log(`👤 ${users.length} users`);

  // ── 2. PUROKS ─────────────────────────────────────────────────────────────
  const puroks = await prisma.purok.createManyAndReturn({ data: PUROK_NAMES.map((name) => ({ name })) });
  console.log(`📍 ${puroks.length} puroks`);

  // ── 3. HOUSEHOLDS & RESIDENTS ─────────────────────────────────────────────
  type Tier = "POOR" | "LOWER_MIDDLE" | "MIDDLE";
  type Person = {
    fname: string; lname: string; mname: string | null; sex: "MALE" | "FEMALE"; age: number;
    civil: Prisma.ResidentCreateManyInput["civil_status"]; role: "HEAD" | "SPOUSE" | "CHILD" | "PARENT" | "OTHER";
    pwd?: string; soloParent?: boolean;
  };
  type HouseholdPlan = {
    household_no: string; purok_id: number; purokName: string; tier: Tier; address: string;
    created_at: Date; residentSince: Date; members: Person[]; fourPs: boolean; indigenous: boolean;
  };

  const PWD_TYPES = [
    "Physical Disability (Orthopedic)", "Visual Disability", "Deaf / Hard of Hearing",
    "Psychosocial Disability", "Intellectual Disability", "Speech and Language Impairment", "Chronic Illness",
  ];

  function makeKids(lname: string, motherMaiden: string, motherAge: number, count: number): Person[] {
    const kids: Person[] = [];
    let age = Math.max(0, motherAge - int(19, 26));
    for (let i = 0; i < count && age >= 0; i++) {
      const sex = chance(0.5) ? "MALE" : "FEMALE";
      kids.push({ fname: firstName(sex), lname, mname: motherMaiden, sex, age, civil: "SINGLE", role: "CHILD" });
      age -= int(2, 4);
    }
    return kids;
  }

  // Household creation dates: most were encoded in an initial census ~1.5–2
  // years ago, the rest trickle in (with a few this month and last month so
  // the dashboard's growth figures have something to compare).
  function householdCreatedAt(i: number, total: number): Date {
    if (i >= total - 3) return officeTime(addDays(TODAY, -(TODAY.getDate() - 1)), TODAY); // this month
    if (i >= total - 6) return officeTime(monthsAgo(1), addDays(TODAY, -TODAY.getDate())); // last month
    if (i < total * 0.7) return officeTime(monthsAgo(22), monthsAgo(18));
    return officeTime(monthsAgo(17), monthsAgo(2));
  }

  const plans: HouseholdPlan[] = [];
  let hhSeq = 0;
  const totalHouseholds = HOUSEHOLDS_PER_PUROK.reduce((a, b) => a + b, 0);
  const householdOrder = shuffle(
    HOUSEHOLDS_PER_PUROK.flatMap((n, p) => Array.from({ length: n }, () => p))
  );

  for (const [i, p] of householdOrder.entries()) {
    const purok = puroks[p];
    const tier = weighted<Tier>([["POOR", 40], ["LOWER_MIDDLE", 42], ["MIDDLE", 18]]);
    const lname = pick(SURNAMES);
    const street = pick(STREETS[purok.name]);
    const address = street.startsWith("Sitio") ? `${street}, ${purok.name}` : `Blk ${int(1, 12)} Lot ${int(1, 30)}, ${street}`;
    const members: Person[] = [];
    const shape = weighted([["FAMILY", 50], ["EXTENDED", 20], ["SOLO_PARENT", 9], ["YOUNG_COUPLE", 9], ["ALONE", 12]] as const);

    if (shape === "FAMILY" || shape === "EXTENDED" || shape === "YOUNG_COUPLE") {
      const headAge = shape === "YOUNG_COUPLE" ? int(21, 29) : int(28, 58);
      const wifeAge = Math.max(18, headAge + int(-6, 2));
      const maiden = pick(SURNAMES);
      const liveIn = chance(0.1);
      const civil = liveIn ? "LIVE_IN" : "MARRIED";
      members.push({ fname: firstName("MALE"), lname, mname: pick(SURNAMES), sex: "MALE", age: headAge, civil, role: "HEAD" });
      members.push({ fname: firstName("FEMALE"), lname: liveIn ? maiden : lname, mname: liveIn ? pick(SURNAMES) : maiden, sex: "FEMALE", age: wifeAge, civil, role: "SPOUSE" });
      const kidCount = shape === "YOUNG_COUPLE" ? int(0, 1) : tier === "POOR" ? int(2, 5) : int(1, 3);
      members.push(...makeKids(lname, maiden, wifeAge, kidCount));
      if (shape === "EXTENDED") {
        if (chance(0.35)) {
          // Both grandparents
          const gpAge = int(62, 80);
          members.push({ fname: firstName("MALE"), lname, mname: pick(SURNAMES), sex: "MALE", age: gpAge, civil: "MARRIED", role: "PARENT" });
          members.push({ fname: firstName("FEMALE"), lname, mname: pick(SURNAMES), sex: "FEMALE", age: Math.max(60, gpAge + int(-5, 1)), civil: "MARRIED", role: "PARENT" });
        } else {
          const gpSex = chance(0.6) ? "FEMALE" : "MALE";
          members.push({ fname: firstName(gpSex), lname: gpSex === "MALE" ? lname : pick(SURNAMES), mname: pick(SURNAMES), sex: gpSex, age: int(64, 88), civil: "WIDOWED", role: "PARENT" });
        }
      }
    } else if (shape === "SOLO_PARENT") {
      const momAge = int(24, 46);
      const maiden = pick(SURNAMES);
      members.push({ fname: firstName("FEMALE"), lname, mname: maiden, sex: "FEMALE", age: momAge, civil: chance(0.6) ? "SEPARATED" : "SINGLE", role: "HEAD", soloParent: true });
      members.push(...makeKids(lname, lname, momAge, int(1, 3)));
    } else {
      const old = chance(0.65);
      const sex = chance(0.55) ? "FEMALE" : "MALE";
      members.push({ fname: firstName(sex), lname, mname: pick(SURNAMES), sex, age: old ? int(61, 86) : int(24, 45), civil: old ? "WIDOWED" : "SINGLE", role: "HEAD" });
    }

    // ~6% of residents 10+ have a registered disability.
    for (const m of members) if (m.age >= 10 && chance(0.06)) m.pwd = pick(PWD_TYPES);

    const hasKids = members.some((m) => m.age < 18);
    const created_at = householdCreatedAt(i, totalHouseholds);
    hhSeq++;
    plans.push({
      household_no: `HHNP${String(100_000_000 + hhSeq).padStart(9, "0")}`,
      purok_id: purok.id,
      purokName: purok.name,
      tier,
      address,
      created_at,
      residentSince: yearsAgo(int(1, 35)),
      members,
      fourPs: tier === "POOR" && hasKids && chance(0.5),
      indigenous: chance(0.04),
    });
  }

  const households = await prisma.household.createManyAndReturn({
    data: plans.map((h) => {
      const poor = h.tier === "POOR";
      const housing = poor ? weighted([["OWN", 4], ["RENT", 2], ["SHARED", 2], ["INFORMAL", 2]] as const) : weighted([["OWN", 8], ["RENT", 2]] as const);
      return {
        household_no: h.household_no,
        purok_id: h.purok_id,
        address: h.address,
        housing_type: housing,
        water_source: poor ? weighted([["COMMUNAL", 5], ["WELL", 3], ["INDIVIDUAL", 2]] as const) : weighted([["INDIVIDUAL", 9], ["COMMUNAL", 1]] as const),
        comfort_room: poor ? weighted([["OWN", 5], ["SHARED", 3], ["NONE", 1]] as const) : "OWN",
        tenure_status: housing === "RENT" ? "RENTER" : housing === "SHARED" ? "SHARER" : housing === "INFORMAL" ? "CARETAKER" : "OWNER",
        household_unit: weighted([["SINGLE_HOUSE", 8], ["DUPLEX", 1], ["APARTMENT", 1]] as const),
        no_of_families: chance(0.12) ? 2 : 1,
        monthly_income: new Prisma.Decimal(poor ? money(4_000, 9_500) : h.tier === "LOWER_MIDDLE" ? money(10_000, 24_000) : money(25_000, 60_000)),
        waste_disposal: weighted([["COLLECTED", 6], ["COMPOSTED", 2], ["BURNED", 1], ["BURIED", 1]] as const),
        power_supply: poor ? weighted([["ELECTRIC_METERED", 5], ["ELECTRIC_SHARED", 4], ["SOLAR", 1]] as const) : "ELECTRIC_METERED",
        created_at: h.created_at,
      };
    }),
  });
  console.log(`🏠 ${households.length} households`);

  const POOR_JOBS = ["Farmer", "Fisherman", "Construction Worker", "Vendor", "Tricycle Driver", "Laborer", "Habal-habal Driver", "Laundry Worker"];
  const MID_JOBS = ["Teacher", "Nurse", "Police Officer", "Office Clerk", "Call Center Agent", "Engineer", "Seafarer", "Store Owner", "Barangay Tanod", "Factory Worker", "Midwife", "Electrician"];
  const BLOOD = ["O+", "A+", "B+", "AB+", "O-", "A-"];

  type ResidentMeta = { planIndex: number; person: Person };
  const residentRows: Prisma.ResidentCreateManyInput[] = [];
  const residentMeta: ResidentMeta[] = [];

  plans.forEach((h, hi) => {
    for (const m of h.members) {
      const birthdate = birthdateForAge(m.age);
      const adult = m.age >= 18;
      const senior = m.age >= 60;
      let employment: string | null = null;
      let occupation: string | null = null;
      if (m.age < 5) employment = null;
      else if (m.age < 18) { employment = "STUDENT"; occupation = "Student"; }
      else if (m.age <= 22 && chance(0.6)) { employment = "STUDENT"; occupation = "College Student"; }
      else if (senior) { employment = chance(0.8) ? "RETIRED" : "EMPLOYED"; occupation = employment === "RETIRED" ? "Retired" : pick(POOR_JOBS); }
      else if (m.role === "SPOUSE" && m.sex === "FEMALE" && chance(0.45)) { employment = "HOUSEWIFE"; occupation = "Housewife"; }
      else if (chance(h.tier === "POOR" ? 0.22 : 0.08)) { employment = "UNEMPLOYED"; occupation = null; }
      else { employment = "EMPLOYED"; occupation = h.tier === "POOR" ? pick(POOR_JOBS) : h.tier === "MIDDLE" ? pick(MID_JOBS) : pick([...POOR_JOBS, ...MID_JOBS]); }

      const education =
        m.age < 6 ? null
        : m.age < 12 ? "ELEM."
        : m.age < 18 ? "HIGH SCHOOL"
        : m.age <= 22 && employment === "STUDENT" ? "COLLEGE UNDERGRAD."
        : h.tier === "MIDDLE" ? weighted([["COLLEGE GRAD.", 6], ["POST GRAD.", 1], ["VOCATIONAL", 2], ["HIGH SCHOOL", 1]] as const)
        : h.tier === "LOWER_MIDDLE" ? weighted([["HIGH SCHOOL", 5], ["VOCATIONAL", 2], ["COLLEGE UNDERGRAD.", 2], ["COLLEGE GRAD.", 2]] as const)
        : weighted([["ELEM.", 4], ["HIGH SCHOOL", 5], ["NO FORMAL", 1]] as const);

      const income =
        !adult || employment === "STUDENT" ? "BELOW_5K"
        : employment !== "EMPLOYED" ? "BELOW_5K"
        : h.tier === "MIDDLE" ? weighted([["20K_40K", 6], ["10K_20K", 3], ["ABOVE_40K", 1]] as const)
        : h.tier === "LOWER_MIDDLE" ? weighted([["10K_20K", 5], ["5K_10K", 5]] as const)
        : weighted([["BELOW_5K", 5], ["5K_10K", 5]] as const);

      const registered = adult && chance(0.85);
      const residentSince = birthdate > h.residentSince ? birthdate : h.residentSince;
      const legacySector = senior ? "SENIOR" : m.pwd ? "PWD" : h.fourPs ? "4PS" : m.age >= 15 && m.age <= 30 ? "YOUTH" : "N/A";

      residentRows.push({
        household_id: households[hi].id,
        purok_id: h.purok_id,
        fname: m.fname,
        lname: m.lname,
        mname: m.mname,
        sex: m.sex,
        gender: m.sex === "MALE" ? "Male" : "Female",
        birthdate,
        place_of_birth: weighted([["Danao City, Cebu", 7], ["Cebu City, Cebu", 1], ["Compostela, Cebu", 1], ["Carmen, Cebu", 1]] as const),
        civil_status: m.civil,
        citizenship: "Filipino",
        nationality: "Filipino",
        religion: weighted([["Roman Catholic", 85], ["Iglesia ni Cristo", 5], ["Seventh-day Adventist", 4], ["Born Again Christian", 6]] as const),
        employment_status: employment,
        educational_attainment: education,
        occupation,
        income_bracket: income,
        sector: legacySector,
        residency_start_date: residentSince,
        type_of_resident: chance(0.93) ? "PERMANENT" : "TEMPORARY",
        mobile: adult && chance(0.75) ? mobile() : null,
        house_block_lot_no: h.address.startsWith("Blk") ? h.address.split(",")[0] : null,
        street: h.address.split(", ").slice(-1)[0],
        barangay: "Quisol",
        city_municipality: "Danao City",
        province: "Cebu",
        region: "Region VII (Central Visayas)",
        zip_code: "6004",
        blood_type: chance(0.5) ? pick(BLOOD) : null,
        ethnicity: h.indigenous ? "Ata (Indigenous)" : "Cebuano",
        is_registered_voter: registered,
        is_resident_voter: registered && chance(0.92),
        last_voted_year: registered ? (chance(0.82) ? 2025 : 2022) : null,
        created_at: addMinutes(h.created_at, int(1, 40)),
      });
      residentMeta.push({ planIndex: hi, person: m });
    }
  });

  const residents = await prisma.resident.createManyAndReturn({ data: residentRows });
  console.log(`👥 ${residents.length} residents`);

  // Household heads (one update per household; the head is always member 0).
  let offset = 0;
  for (const [hi, h] of plans.entries()) {
    await prisma.household.update({ where: { id: households[hi].id }, data: { household_head_id: residents[offset].id } });
    offset += h.members.length;
  }

  const withMeta = residents.map((r, i) => ({ r, meta: residentMeta[i], plan: plans[residentMeta[i].planIndex], age: ageOn(r.birthdate) }));
  const adults = withMeta.filter((x) => x.age >= 18);
  const seniors = withMeta.filter((x) => x.age >= 60);
  const fullName = (r: { fname: string; mname?: string | null; lname: string }) => `${r.fname} ${r.lname}`;

  // ── 4. SECTORS ────────────────────────────────────────────────────────────
  const sectorRows: Prisma.ResidentSectorCreateManyInput[] = [];
  for (const { r, meta, plan, age } of withMeta) {
    const types = new Set<string>();
    if (age >= 60) types.add("SENIOR");
    if (meta.person.pwd) types.add("PWD");
    if (age >= 15 && age <= 30) types.add("YOUTH");
    if (meta.person.soloParent) types.add("SOLO_PARENT");
    if (plan.fourPs) types.add("4PS");
    if (plan.indigenous) types.add("INDIGENOUS");
    if (meta.person.role === "HEAD" && plan.tier === "POOR" && age >= 18 && plan.members.length >= 5) types.add("SOLO_BREADWINNER");
    for (const sector_type of types) sectorRows.push({ resident_id: r.id, sector_type, created_at: r.created_at });
  }
  await prisma.residentSector.createMany({ data: sectorRows, skipDuplicates: true });
  console.log(`🏷️  ${sectorRows.length} sector tags`);

  // ── 5. SPECIAL REGISTRIES ────────────────────────────────────────────────
  const registryRows: Prisma.SpecialRegistryCreateManyInput[] = [];
  for (const { r, meta, plan, age } of withMeta) {
    if (age >= 60 && chance(0.9)) {
      const turned60 = new Date(r.birthdate.getFullYear() + 60, r.birthdate.getMonth(), r.birthdate.getDate());
      registryRows.push({ resident_id: r.id, registry_type: "SENIOR_CITIZEN", registered_at: officeTime(turned60 > r.created_at ? turned60 : r.created_at, clampPast(addDays(r.created_at > turned60 ? r.created_at : turned60, 200))) });
    }
    if (meta.person.pwd) registryRows.push({ resident_id: r.id, registry_type: "PWD", disability_type: meta.person.pwd, registered_at: officeTime(r.created_at, clampPast(addDays(r.created_at, 300))) });
    if (plan.fourPs) registryRows.push({ resident_id: r.id, registry_type: "FOUR_PS", is_4ps_beneficiary: true, registered_at: officeTime(r.created_at, clampPast(addDays(r.created_at, 60))) });
  }
  await prisma.specialRegistry.createMany({ data: registryRows });
  console.log(`📋 ${registryRows.length} registry entries`);

  // ── 6. GOVERNMENT ASSISTANCE ──────────────────────────────────────────────
  // Only for 4Ps households: the dashboard counts anyone with an assistance
  // record as a 4Ps beneficiary, so giving it to others would inflate that tile.
  const assistanceRows: Prisma.GovernmentAssistanceCreateManyInput[] = [];
  plans.forEach((h, hi) => {
    if (!h.fourPs) return;
    const head = withMeta.find((x) => x.meta.planIndex === hi && x.meta.person.role === "HEAD")!;
    assistanceRows.push({ resident_id: head.r.id, program_name: "Pantawid Pamilyang Pilipino Program (4Ps)", date_enrolled: yearsAgo(int(2, 8)), notes: `Household grantee. ${h.members.filter((m) => m.age < 18).length} monitored children.` });
    if (chance(0.4)) assistanceRows.push({ resident_id: head.r.id, program_name: "AICS (Assistance to Individuals in Crisis Situation)", date_enrolled: officeTime(SEED_START, TODAY), notes: pick(["Medical assistance", "Burial assistance", "Educational assistance"]) });
    if (chance(0.3)) assistanceRows.push({ resident_id: head.r.id, program_name: "Sustainable Livelihood Program (SLP)", date_enrolled: officeTime(SEED_START, TODAY), notes: pick(["Sari-sari store starter kit", "Hog raising", "Food vending cart"]) });
  });
  await prisma.governmentAssistance.createMany({ data: assistanceRows });
  console.log(`🤝 ${assistanceRows.length} assistance records`);

  // ── 7. MIGRANTS ───────────────────────────────────────────────────────────
  const migrantRows: Prisma.MigrantCreateManyInput[] = shuffle([...households]).slice(0, 10).map((hh) => {
    const left = chance(0.5);
    return {
      household_id: hh.id,
      name: `${firstName(chance(0.5) ? "MALE" : "FEMALE")} ${pick(SURNAMES)}`,
      previous_location: left ? null : pick(["Mandaue City", "Lapu-Lapu City", "Bohol", "Leyte", "Mindanao (Cagayan de Oro)"]),
      reason: left ? pick(["Employment abroad (OFW)", "Work in Metro Manila", "College in Cebu City"]) : pick(["Marriage", "Employment", "Relocation after typhoon"]),
      transferred_to: left ? pick(["Saudi Arabia", "Taguig City", "Cebu City", "Japan"]) : null,
      duration_here: left ? null : `${int(1, 6)} years`,
      has_returned: left && chance(0.3),
    };
  });
  await prisma.migrant.createMany({ data: migrantRows });

  // ── 8. OFFICIALS ──────────────────────────────────────────────────────────
  const officialPool = shuffle(adults.filter((x) => x.age >= 25 && x.age <= 65 && !x.meta.person.pwd));
  const termStart = new Date(2023, 10, 30); // 2023 Barangay and SK elections; terms began Nov 30, 2023
  const youth = shuffle(withMeta.filter((x) => x.age >= 18 && x.age <= 24))[0] ?? officialPool[20];
  const officialPlan: { who: (typeof withMeta)[number]; position: string; purok?: string }[] = [
    { who: officialPool[0], position: "Punong Barangay" },
    ...PUROK_NAMES.map((p, i) => ({ who: officialPool[1 + i], position: "Barangay Kagawad", purok: p })),
    { who: officialPool[6], position: "Barangay Kagawad", purok: "At-Large" },
    { who: officialPool[7], position: "Barangay Kagawad", purok: "At-Large" },
    { who: youth, position: "SK Chairperson" },
    { who: officialPool[8], position: "Barangay Secretary" },
    { who: officialPool[9], position: "Barangay Treasurer" },
    { who: officialPool[10], position: "Lupon Tagapamayapa Chairperson" },
    { who: officialPool[11], position: "Barangay Tanod Chief" },
    { who: officialPool[12], position: "BHW Coordinator" },
  ];
  await prisma.brgyOfficial.createMany({
    data: officialPlan.map((o) => ({
      resident_id: o.who.r.id,
      position: o.position,
      purok_assignment: o.purok ?? null,
      contact_no: o.who.r.mobile ?? mobile(),
      term_start: ["Barangay Secretary", "Barangay Treasurer", "Barangay Tanod Chief", "BHW Coordinator"].includes(o.position) ? new Date(2023, 11, 4) : termStart,
      is_active: true,
    })),
  });
  const captainName = fullName(officialPlan[0].who.r);
  const secretaryName = fullName(officialPlan[9].who.r);
  const treasurerName = fullName(officialPlan[10].who.r);
  console.log(`🏛️  ${officialPlan.length} officials (Punong Barangay: ${captainName})`);

  // ── 9. DECEASED ───────────────────────────────────────────────────────────
  const officialIds = new Set(officialPlan.map((o) => o.who.r.id));
  const deceased = shuffle(seniors.filter((x) => x.age >= 75 && !officialIds.has(x.r.id))).slice(0, 4);
  const causes = [
    ["Cardiopulmonary arrest", "Hypertensive cardiovascular disease"],
    ["Community-acquired pneumonia", "Chronic obstructive pulmonary disease"],
    ["Cerebrovascular accident (stroke)", "Hypertension"],
    ["Septic shock", "Diabetes mellitus type 2"],
  ] as const;
  for (const [i, d] of deceased.entries()) {
    const date_of_death = officeTime(monthsAgo(11 - i * 3), monthsAgo(10 - i * 3));
    await prisma.resident.update({ where: { id: d.r.id }, data: { is_deceased: true } });
    await prisma.deceasedRecord.create({
      data: { resident_id: d.r.id, date_of_death, immediate_cause: causes[i][0], underlying_cause: causes[i][1], recorded_by: secretary.id, created_at: addDays(date_of_death, int(1, 5)) },
    });
  }
  const deceasedIds = new Set(deceased.map((d) => d.r.id));
  const living = withMeta.filter((x) => !deceasedIds.has(x.r.id));
  const livingAdults = living.filter((x) => x.age >= 18);
  console.log(`🕯️  ${deceased.length} deceased records`);

  // ── 10. CERTIFICATES ──────────────────────────────────────────────────────
  type CertType = Prisma.CertificateCreateManyInput["certificate_type"];
  const PURPOSES: Record<string, readonly string[]> = {
    RESIDENCY: ["Employment requirement", "School enrollment", "PhilHealth registration", "Bank account opening", "SSS requirement", "Postal ID application"],
    INDIGENCY: ["Medical assistance", "Educational assistance", "DSWD AICS requirement", "Burial assistance", "PAO legal assistance"],
    CLEARANCE: ["Employment", "NBI clearance application", "Police clearance", "Loan application", "Travel requirement"],
    GOOD_MORAL: ["Scholarship application", "College admission", "Employment"],
    BUSINESS_PERMIT: ["New sari-sari store", "Business permit renewal", "Carinderia permit", "Water refilling station renewal"],
    COHABITATION: ["Proof of cohabitation for SSS beneficiary", "PhilHealth dependent enrollment"],
    SOLO_PARENT: ["Solo Parent ID application (RA 11861)", "Solo parent benefits"],
    FIRST_TIME_JOB_SEEKER: ["First-time job application (RA 11261)"],
    LATE_REGISTRATION: ["Late registration of birth (PSA)"],
  };
  const typeWeights = (month: number): (readonly [CertType, number])[] => [
    ["RESIDENCY", 30],
    ["INDIGENCY", month === 5 || month === 6 ? 26 : 18],
    ["CLEARANCE", 24],
    ["GOOD_MORAL", month >= 4 && month <= 6 ? 12 : 4],
    ["BUSINESS_PERMIT", month === 0 ? 40 : 4],
    ["COHABITATION", 2],
    ["SOLO_PARENT", 3],
    ["FIRST_TIME_JOB_SEEKER", month >= 3 && month <= 6 ? 12 : 4],
    ["LATE_REGISTRATION", 1],
  ];
  type CertDraft = Omit<Prisma.CertificateCreateManyInput, "certificate_no" | "queue_number"> & { requested_at: Date };
  const certDrafts: CertDraft[] = [];
  function draftCertificate(type: CertType, requested_at: Date, forced?: "PENDING" | "PROCESSING"): CertDraft {
    const pool = type === "FIRST_TIME_JOB_SEEKER" ? livingAdults.filter((x) => x.age <= 30)
      : type === "SOLO_PARENT" ? living.filter((x) => x.meta.person.soloParent)
      : livingAdults;
    const manual = chance(0.03);
    const resident = (pool.length ? pick(pool) : pick(livingAdults)).r;
    const ageDays = (NOW.getTime() - requested_at.getTime()) / DAY;
    const gapMinutes = weighted([[int(15, 90), 60], [int(120, 480), 25], [int(1440, 4320), 15]] as const);
    const wouldRelease = addMinutes(requested_at, gapMinutes);
    const status: Prisma.CertificateCreateManyInput["status"] =
      forced ?? (chance(0.03) ? "CANCELLED"
        : wouldRelease <= NOW && ageDays > 1 ? "RELEASED"
        : ageDays > 0.5 ? "PROCESSING"
        : "PENDING");
    const free = type === "INDIGENCY" || type === "FIRST_TIME_JOB_SEEKER";
    return {
      resident_id: manual ? null : resident.id,
      flagged_manual: manual,
      manual_name: manual ? `${firstName("MALE")} ${pick(SURNAMES)}` : null,
      manual_address: manual ? "Brgy. Poblacion, Danao City" : null,
      issued_by: pick(deskStaff),
      certificate_type: type,
      purpose: pick(PURPOSES[type]),
      requested_at,
      issued_at: status === "RELEASED" ? wouldRelease : null,
      status,
      payment_status: status === "CANCELLED" || status === "PENDING" ? "PENDING" : free ? "WAIVED" : "PAID",
    };
  }
  for (let m = 22; m >= 0; m--) {
    const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const monthEnd = m === 0 ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - m + 1, 0);
    const month = monthStart.getMonth();
    const seasonal = month === 0 ? 1.6 : month >= 4 && month <= 6 ? 1.4 : month === 11 ? 0.7 : 1;
    const growth = 1 + (22 - m) * 0.02;
    const count = Math.round(13 * seasonal * growth * (m === 0 ? TODAY.getDate() / 30 : 1)) + int(-2, 2);
    for (let i = 0; i < count; i++) {
      certDrafts.push(draftCertificate(weighted(typeWeights(month)), officeTime(monthStart, monthEnd)));
    }
  }
  // The live queue: requests from the last couple of working days that are
  // still waiting, so the Document Queue and "pending requests" tile have work.
  const lastWorkday = weekdayOnOrBefore(isWeekend(TODAY) ? TODAY : addDays(TODAY, -1));
  for (let i = 0; i < 10; i++) {
    const day = i < 6 ? (isWeekend(TODAY) ? lastWorkday : TODAY) : weekdayOnOrBefore(addDays(lastWorkday, -1));
    const requested_at = clampPast(at(day, int(8, 15), int(0, 59)));
    certDrafts.push(draftCertificate(weighted(typeWeights(TODAY.getMonth())), requested_at, i < 5 ? "PENDING" : "PROCESSING"));
  }
  // Number them per year in request order, like the real request flow.
  certDrafts.sort((a, b) => a.requested_at.getTime() - b.requested_at.getTime());
  const perYear = new Map<number, number>();
  const certRows: Prisma.CertificateCreateManyInput[] = certDrafts.map((c) => {
    const y = c.requested_at.getFullYear();
    const n = (perYear.get(y) ?? 0) + 1;
    perYear.set(y, n);
    return { ...c, certificate_no: `CERT-${y}-${String(n).padStart(6, "0")}`, queue_number: `Q-${y}-${String(n).padStart(4, "0")}` };
  });
  const certificates = await prisma.certificate.createManyAndReturn({ data: certRows });
  const certCounts = certificates.reduce<Record<string, number>>((acc, c) => ((acc[c.status] = (acc[c.status] ?? 0) + 1), acc), {});
  console.log(`📜 ${certificates.length} certificates (${Object.entries(certCounts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")})`);

  // ── 11. BLOTTER ───────────────────────────────────────────────────────────
  const INCIDENTS = [
    ["Noise Complaint", 16, "Complainant reports loud videoke and drinking session past 10:00 PM in violation of the barangay noise ordinance."],
    ["Unpaid Debt", 14, "Complainant alleges respondent failed to pay a personal loan despite repeated demands."],
    ["Physical Injury", 10, "Complainant alleges respondent struck him during a heated argument, causing minor bruises."],
    ["Property Dispute", 10, "Dispute over the boundary of adjoining lots; complainant claims respondent's fence encroaches on her property."],
    ["Verbal Abuse / Oral Defamation", 10, "Complainant alleges respondent shouted insults and spread false accusations in front of neighbors."],
    ["Theft", 9, "Complainant reports items taken from the yard overnight; suspects respondent, who was seen nearby."],
    ["Stray Animals", 8, "Respondent's dogs roam unleashed and have bitten a child; complainant requests action under the barangay ordinance."],
    ["Trespassing", 6, "Respondent allegedly entered complainant's farm lot without permission and harvested coconuts."],
    ["Domestic Dispute", 5, "Family quarrel over shared household expenses escalated; complainant requests mediation."],
    ["Vandalism", 4, "Complainant reports graffiti and a broken window on her store; respondent was identified by a witness."],
  ] as const;
  await prisma.incidentType.createMany({ data: INCIDENTS.map(([name]) => ({ name })) });

  type CaseDraft = Omit<Prisma.BlotterCaseCreateManyInput, "case_number"> & { created_at: Date; resolvedAt?: Date; finalStatus: "FILED" | "ONGOING" | "RESOLVED" | "DISMISSED" };
  const caseDrafts: CaseDraft[] = [];
  function draftCase(created_at: Date, forced?: "FILED" | "ONGOING"): CaseDraft {
    const [type, , narrative] = weighted(INCIDENTS.map((x) => [x, x[1]] as const));
    const incident_date = addDays(startOfDay(created_at), -int(0, 3));
    const complainant = pick(livingAdults);
    const respondentIsResident = chance(0.8);
    let respondent = pick(livingAdults);
    while (respondent.r.id === complainant.r.id) respondent = pick(livingAdults);
    const ageDays = (NOW.getTime() - created_at.getTime()) / DAY;
    const hearing_date = at(addDays(startOfDay(created_at), forced === "FILED" ? int(8, 12) : int(3, 10)), int(9, 15));
    const finalStatus = forced
      ?? (ageDays > 45 ? weighted([["RESOLVED", 70], ["DISMISSED", 15], ["ONGOING", 15]] as const)
        : ageDays > 14 ? weighted([["RESOLVED", 45], ["ONGOING", 45], ["DISMISSED", 10]] as const)
        : weighted([["FILED", 60], ["ONGOING", 40]] as const));
    const resolvedAt = finalStatus === "RESOLVED" || finalStatus === "DISMISSED" ? clampPast(addDays(hearing_date, int(0, 21))) : undefined;
    return {
      incident_type: type,
      incident_narrative: narrative,
      incident_date,
      created_at,
      // A FILED case has its first hearing still ahead (or not yet set).
      hearing_date: finalStatus === "FILED" ? (hearing_date > NOW ? hearing_date : null) : hearing_date,
      complainant_id: complainant.r.id,
      complainant_name: fullName(complainant.r),
      complainant_contact: complainant.r.mobile ?? mobile(),
      complainant_address: complainant.plan.address,
      respondent_id: respondentIsResident ? respondent.r.id : null,
      respondent_name: respondentIsResident ? fullName(respondent.r) : `${firstName("MALE")} ${pick(SURNAMES)} (non-resident)`,
      status: finalStatus,
      // Unsettled after mediation and conciliation → Certificate to File Action.
      escalated: finalStatus === "ONGOING" && ageDays > 45 ? true : !forced && chance(0.04),
      finalStatus,
      resolvedAt,
    };
  }
  for (let m = 22; m >= 1; m--) {
    const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const monthEnd = new Date(TODAY.getFullYear(), TODAY.getMonth() - m + 1, 0);
    const count = int(1, 4) + (monthStart.getMonth() === 11 ? 1 : 0);
    for (let i = 0; i < count; i++) caseDrafts.push(draftCase(officeTime(monthStart, monthEnd)));
  }
  // Recent, still-open cases (always some on the dashboard's "active cases").
  for (const [from, to, status] of [[6, 1, "FILED"], [6, 1, "FILED"], [5, 0, "FILED"], [13, 8, "ONGOING"], [12, 8, "ONGOING"]] as const) {
    caseDrafts.push(draftCase(officeTime(daysAgo(from), daysAgo(to)), status));
  }
  caseDrafts.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const casesPerYear = new Map<number, number>();
  const cases = await prisma.blotterCase.createManyAndReturn({
    data: caseDrafts.map(({ finalStatus: _f, resolvedAt: _r, ...c }) => {
      const y = c.created_at.getFullYear();
      const n = (casesPerYear.get(y) ?? 0) + 1;
      casesPerYear.set(y, n);
      return { ...c, case_number: `BLT-${y}-${String(n).padStart(4, "0")}` };
    }),
  });
  const updateRows: Prisma.BlotterUpdateCreateManyInput[] = [];
  cases.forEach((c, i) => {
    const d = caseDrafts[i];
    updateRows.push({ blotter_case_id: c.id, updated_by: secretary.id, notes: "Complaint recorded. Summons issued to respondent for mediation before the Punong Barangay.", new_status: "FILED", updated_at: addMinutes(c.created_at, 20) });
    if (d.finalStatus !== "FILED" && c.hearing_date && c.hearing_date <= NOW) {
      updateRows.push({ blotter_case_id: c.id, updated_by: secretary.id, notes: "Both parties appeared. Mediation conducted; referred to the Pangkat ng Tagapagkasundo for conciliation.", new_status: "ONGOING", updated_at: c.hearing_date });
    }
    if (d.finalStatus === "RESOLVED" && d.resolvedAt) {
      updateRows.push({ blotter_case_id: c.id, updated_by: secretary.id, notes: pick(["Amicable settlement signed by both parties.", "Respondent agreed to pay in installments; settlement signed.", "Parties reconciled; respondent issued a written apology."]), new_status: "RESOLVED", updated_at: d.resolvedAt });
    }
    if (d.finalStatus === "DISMISSED" && d.resolvedAt) {
      updateRows.push({ blotter_case_id: c.id, updated_by: secretary.id, notes: "Complainant failed to appear at two scheduled hearings. Case dismissed.", new_status: "DISMISSED", updated_at: d.resolvedAt });
    }
    if (c.escalated) {
      updateRows.push({ blotter_case_id: c.id, updated_by: captain.id, notes: "No settlement reached. Certificate to File Action issued; parties may proceed to court or the prosecutor.", new_status: "ONGOING", updated_at: clampPast(addDays(c.hearing_date ?? c.created_at, 30)) });
    }
  });
  await prisma.blotterUpdate.createMany({ data: updateRows });
  console.log(`🚔 ${cases.length} blotter cases, ${updateRows.length} updates`);

  // ── 12. HEALTH RECORDS ────────────────────────────────────────────────────
  const healthRows: Prisma.HealthRecordCreateManyInput[] = [];
  const women = living.filter((x) => x.r.sex === "FEMALE");
  const kidsUnder6 = living.filter((x) => x.age < 6);
  const over40 = living.filter((x) => x.age >= 40);
  const pregnant = shuffle(women.filter((x) => x.age >= 20 && x.age <= 38 && x.r.civil_status !== "SINGLE")).slice(0, 7);
  for (let m = 22; m >= 0; m--) {
    const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const monthEnd = m === 0 ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - m + 1, 0);
    const rainy = monthStart.getMonth() >= 5 && monthStart.getMonth() <= 9;
    const n = int(6, 10);
    for (let i = 0; i < n; i++) {
      const kind = weighted([
        ["Hypertension", 22], ["Diabetes", 10], ["Prenatal Checkup", 12], ["Well-child Checkup", 14],
        ["Family Planning", 10], ["Tuberculosis (DOTS)", 4], ["Dengue", rainy ? 8 : 1], ["Animal Bite", 4], ["Nutrition (OPT Plus)", 6],
      ] as const);
      const when = officeTime(monthStart, monthEnd);
      let who = pick(over40);
      let notes = "";
      switch (kind) {
        case "Hypertension": who = pick(over40); notes = `BP ${int(135, 170)}/${int(85, 105)} mmHg. ${pick(["Maintenance: Amlodipine 5 mg daily.", "Advised low-salt diet and daily walking.", "Referred to the Rural Health Unit for evaluation."])}`; break;
        case "Diabetes": who = pick(over40); notes = `FBS ${int(130, 240)} mg/dL. ${pick(["On Metformin 500 mg twice daily.", "Advised diet modification; recheck in 1 month."])}`; break;
        case "Prenatal Checkup": who = pick(pregnant.length ? pregnant : women); notes = `${int(10, 36)} weeks AOG. BP ${int(100, 125)}/${int(65, 80)}. Fetal heart tone ${int(130, 155)} bpm. Ferrous sulfate + folic acid given.`; break;
        case "Well-child Checkup": who = pick(kidsUnder6.length ? kidsUnder6 : living); notes = `Weight ${int(6, 20)} kg, length/height ${int(60, 115)} cm. Growth normal for age. Vitamin A given.`; break;
        case "Family Planning": who = pick(women.filter((x) => x.age >= 18 && x.age <= 45)); notes = `Method: ${pick(["Pills (3 cycles given)", "DMPA injectable", "Implant", "Condoms", "Natural Family Planning counseling"])}.`; break;
        case "Tuberculosis (DOTS)": who = pick(livingAdults); notes = `DOTS month ${int(1, 6)} of 6. Treatment adherent. Sputum ${pick(["negative", "for follow-up"])}.`; break;
        case "Dengue": who = pick(living); notes = `Fever ${int(3, 5)} days, positive NS1. ${pick(["Referred to Danao City Hospital.", "Home care; oral rehydration advised. Search-and-destroy done in purok."])}`; break;
        case "Animal Bite": who = pick(living); notes = `Category ${pick(["II", "III"])} ${pick(["dog", "cat"])} bite. Referred to the Animal Bite Treatment Center for anti-rabies vaccine.`; break;
        case "Nutrition (OPT Plus)": who = pick(kidsUnder6.length ? kidsUnder6 : living); notes = `Operation Timbang: ${pick(["Normal", "Normal", "Underweight", "Stunted"])}. Weight ${int(7, 18)} kg.`; break;
      }
      healthRows.push({ resident_id: who.r.id, record_type: kind, notes, recorded_by: bhw.id, recorded_at: when });
    }
  }
  await prisma.healthRecord.createMany({ data: healthRows });
  console.log(`🏥 ${healthRows.length} health records`);

  // ── 13. VACCINATIONS ──────────────────────────────────────────────────────
  // Children under 6: the routine Expanded Program on Immunization schedule
  // (age in days). Only doses that would already be due are recorded.
  const EPI: [string, number][] = [
    ["BCG", 0], ["Hepatitis B (birth dose)", 0],
    ["Pentavalent (DPT-HepB-Hib) 1", 42], ["OPV 1", 42], ["PCV 1", 42],
    ["Pentavalent (DPT-HepB-Hib) 2", 70], ["OPV 2", 70], ["PCV 2", 70],
    ["Pentavalent (DPT-HepB-Hib) 3", 98], ["OPV 3", 98], ["PCV 3", 98], ["IPV", 98],
    ["MMR 1", 270], ["MMR 2", 365],
  ];
  const vaxRows: Prisma.VaccinationCreateManyInput[] = [];
  for (const k of living.filter((x) => x.age < 6)) {
    const missedSome = chance(0.15);
    for (const [name, days] of EPI) {
      const date = addDays(k.r.birthdate, days + int(0, 10));
      if (date > NOW) continue;
      if (missedSome && days >= 270) continue; // a few defaulters, for the follow-up list
      vaxRows.push({ resident_id: k.r.id, vaccine_name: name, date_given: date, recorded_by: bhw.id });
    }
  }
  for (const s of living.filter((x) => x.age >= 60)) {
    for (const y of [1, 0]) {
      const flu = new Date(TODAY.getFullYear() - y, 3, int(5, 28)); // April flu drives
      if (flu <= NOW && chance(0.6)) vaxRows.push({ resident_id: s.r.id, vaccine_name: "Influenza", date_given: flu, recorded_by: bhw.id });
    }
    if (chance(0.4)) vaxRows.push({ resident_id: s.r.id, vaccine_name: "Pneumococcal (PPSV23)", date_given: officeTime(SEED_START, TODAY), recorded_by: bhw.id });
  }
  for (const p of pregnant) vaxRows.push({ resident_id: p.r.id, vaccine_name: "Td (tetanus-diphtheria)", date_given: officeTime(monthsAgo(6), TODAY), recorded_by: bhw.id });
  for (const g of living.filter((x) => x.r.sex === "FEMALE" && x.age >= 9 && x.age <= 14 && chance(0.5))) {
    const d1 = officeTime(monthsAgo(14), monthsAgo(8));
    vaxRows.push({ resident_id: g.r.id, vaccine_name: "HPV 1", date_given: d1, recorded_by: bhw.id });
    if (addDays(d1, 180) <= NOW) vaxRows.push({ resident_id: g.r.id, vaccine_name: "HPV 2", date_given: addDays(d1, 180), recorded_by: bhw.id });
  }
  await prisma.vaccination.createMany({ data: vaxRows });
  console.log(`💉 ${vaxRows.length} vaccinations`);

  // ── 14. EQUIPMENT & BORROWINGS ───────────────────────────────────────────
  const equipmentRows: Prisma.EquipmentCreateManyInput[] = [
    { name: "Monobloc Chairs", asset_type: "Furniture", quantity: 120, condition: "FAIR", status: "SERVICEABLE", purchase_cost: 42_000, current_value: 18_000, location: "Stock room", years: 5 },
    { name: "Folding Tables", asset_type: "Furniture", quantity: 15, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 37_500, current_value: 24_000, location: "Stock room", years: 3 },
    { name: "Tent (3x3 m)", asset_type: "Event Equipment", quantity: 6, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 54_000, current_value: 40_000, location: "Stock room", years: 2 },
    { name: "Sound System Set", asset_type: "Electronics", quantity: 1, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 65_000, current_value: 39_000, location: "Session hall", years: 4, serial: "SS-YMH-20811" },
    { name: "Megaphone", asset_type: "Electronics", quantity: 4, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 9_600, current_value: 5_200, location: "Tanod outpost", years: 3 },
    { name: "Generator Set (5 kVA)", asset_type: "Disaster Response", quantity: 1, condition: "NEEDS_REPAIR", status: "UNSERVICEABLE", purchase_cost: 78_000, current_value: 25_000, location: "Motor pool", years: 7, serial: "GEN-5K-55021" },
    { name: "Rubber Boat", asset_type: "Disaster Response", quantity: 1, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 120_000, current_value: 96_000, location: "BDRRM storage", years: 2 },
    { name: "Life Vests", asset_type: "Disaster Response", quantity: 20, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 24_000, current_value: 20_000, location: "BDRRM storage", years: 2 },
    { name: "Spine Board", asset_type: "Disaster Response", quantity: 2, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 16_000, current_value: 12_000, location: "Health center", years: 2 },
    { name: "Desktop Computer", asset_type: "IT Equipment", quantity: 3, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 105_000, current_value: 60_000, location: "Secretary's office", years: 3, serial: "PC-BRGY-001..003" },
    { name: "Laser Printer", asset_type: "IT Equipment", quantity: 2, condition: "FAIR", status: "SERVICEABLE", purchase_cost: 28_000, current_value: 12_000, location: "Secretary's office", years: 4 },
    { name: "Projector", asset_type: "Electronics", quantity: 1, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 32_000, current_value: 22_000, location: "Session hall", years: 2, serial: "PJ-EPS-77310" },
    { name: "Grass Cutter", asset_type: "Tools", quantity: 2, condition: "POOR", status: "SERVICEABLE", purchase_cost: 22_000, current_value: 6_000, location: "Motor pool", years: 5 },
    { name: "Wheelbarrow", asset_type: "Tools", quantity: 4, condition: "FAIR", status: "SERVICEABLE", purchase_cost: 10_000, current_value: 4_000, location: "Motor pool", years: 4 },
    { name: "Patrol Motorcycle", asset_type: "Vehicle", quantity: 1, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 95_000, current_value: 70_000, location: "Tanod outpost", years: 2, serial: "MC-ENG-KX125-4471" },
    { name: "Blood Pressure Monitor", asset_type: "Medical", quantity: 3, condition: "GOOD", status: "SERVICEABLE", purchase_cost: 7_500, current_value: 5_000, location: "Health center", years: 1 },
    { name: "Basketball Ring Set", asset_type: "Sports", quantity: 2, condition: "POOR", status: "MISSING", purchase_cost: 30_000, current_value: 0, location: "Covered court", years: 6 },
    { name: "Typewriter", asset_type: "Office Equipment", quantity: 1, condition: "DECOMMISSIONED", status: "UNSERVICEABLE", purchase_cost: 8_000, current_value: 0, location: "Stock room", years: 15 },
  ].map(({ years, serial, purchase_cost, current_value, ...e }) => {
    const acquired = yearsAgo(years);
    return {
      ...e,
      serial_number: serial ?? null,
      purchase_cost: new Prisma.Decimal(purchase_cost),
      current_value: new Prisma.Decimal(current_value),
      purchase_date: acquired,
      date_acquired: acquired,
      assigned_to: e.location === "Tanod outpost" ? "Barangay Tanod Chief" : e.location === "Health center" ? "BHW Coordinator" : "Barangay Secretary",
      condition: e.condition as Prisma.EquipmentCreateManyInput["condition"],
      status: e.status as Prisma.EquipmentCreateManyInput["status"],
      created_at: monthsAgo(22),
    };
  });
  const equipment = await prisma.equipment.createManyAndReturn({ data: equipmentRows });
  const lendable = equipment.filter((e) => e.status === "SERVICEABLE" && ["Furniture", "Event Equipment", "Electronics", "Tools"].includes(e.asset_type ?? ""));
  const borrowRows: Prisma.EquipmentBorrowingCreateManyInput[] = [];
  for (let m = 22; m >= 0; m--) {
    const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const monthEnd = m === 0 ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - m + 1, 0);
    const n = int(1, 3) + (monthStart.getMonth() === 11 || monthStart.getMonth() === 4 ? 2 : 0); // fiestas & Christmas
    for (let i = 0; i < n; i++) {
      const eq = pick(lendable);
      const borrower = pick(livingAdults);
      const borrowed = officeTime(monthStart, monthEnd);
      const expected = addDays(startOfDay(borrowed), int(1, 4));
      const late = chance(0.15);
      const returned = addDays(expected, late ? int(1, 5) : 0);
      const open = returned > NOW;
      borrowRows.push({
        equipment_id: eq.id,
        resident_id: borrower.r.id,
        borrower_name: fullName(borrower.r),
        date_borrowed: borrowed,
        expected_return: expected,
        actual_return: open ? null : at(returned, int(8, 16)),
        return_condition: open ? null : weighted([["Good", 85], ["Minor scratches", 10], ["Damaged", 5]] as const),
        is_overdue: open && expected < NOW,
        recorded_by: pick(deskStaff),
        created_at: borrowed,
      });
    }
  }
  // Make sure there is always something out right now, one of them overdue.
  for (const [i, days] of [[0, -2], [1, 1]] as const) {
    const borrower = pick(livingAdults);
    borrowRows.push({ equipment_id: lendable[i].id, resident_id: borrower.r.id, borrower_name: fullName(borrower.r), date_borrowed: at(daysAgo(4), 9), expected_return: addDays(TODAY, days), actual_return: null, is_overdue: days < 0, recorded_by: encoder.id, created_at: at(daysAgo(4), 9) });
  }
  await prisma.equipmentBorrowing.createMany({ data: borrowRows });
  console.log(`📦 ${equipment.length} equipment items, ${borrowRows.length} borrowings`);

  // ── 15. LEGACY INCOME / EXPENSE LEDGER ───────────────────────────────────
  // Descriptions use the module's category names, so the "by category"
  // breakdown groups cleanly.
  const ledger: Prisma.FinancialRecordCreateManyInput[] = [];
  for (let m = 22; m >= 0; m--) {
    const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth() - m, 1);
    const monthEnd = m === 0 ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - m + 1, 0);
    const mo = monthStart.getMonth();
    const day = (d: number) => clampPast(at(new Date(monthStart.getFullYear(), mo, Math.min(d, monthEnd.getDate())), 10));
    const add = (type: "INCOME" | "EXPENSE", description: string, amount: number, d: number) => {
      const when = day(d);
      if (when > monthEnd && m === 0) return;
      ledger.push({ transaction_type: type, description, amount: new Prisma.Decimal(amount), transaction_date: when, recorded_by: m % 2 ? secretary.id : encoder.id, created_at: when });
    };
    add("INCOME", "IRA Allotment", money(385_000, 405_000, 100), 5);
    add("INCOME", "Barangay Clearance Fees", money(6_000, 12_000), 28);
    add("INCOME", "Certificate Fees", money(4_000, 9_000), 28);
    add("INCOME", "Business Permit Fees", mo === 0 ? money(38_000, 52_000) : money(2_500, 8_000), mo === 0 ? 20 : 25);
    add("INCOME", "Market/Stall Rental", money(12_000, 15_500), 10);
    if (chance(0.25)) add("INCOME", "Donations", money(5_000, 30_000, 500), 15);
    if (chance(0.3)) add("INCOME", "Other Income", money(1_500, 6_000), 18);
    add("EXPENSE", "Honoraria", money(238_000, 252_000, 100), 15);
    add("EXPENSE", "Utilities", money(9_000, 14_500), 12);
    add("EXPENSE", "Office Supplies", money(6_000, 18_000), 8);
    if (mo % 3 === 1) add("EXPENSE", "Infrastructure/Repairs", money(60_000, 180_000, 500), 20);
    if (mo >= 6 && mo <= 10 && chance(0.5)) add("EXPENSE", "Relief Assistance", money(30_000, 120_000, 500), 22);
    if (chance(0.15)) add("EXPENSE", "Equipment Purchase", money(15_000, 70_000, 500), 17);
    if (mo === 2 || mo === 9 || mo === 11) add("EXPENSE", "Events & Assemblies", money(15_000, mo === 11 ? 60_000 : 30_000, 500), 26);
    if (chance(0.3)) add("EXPENSE", "Other Expense", money(1_500, 8_000), 24);
  }
  await prisma.financialRecord.createMany({ data: ledger });
  console.log(`💰 ${ledger.length} ledger entries`);

  // ── 16. FINANCE SUITE ─────────────────────────────────────────────────────
  // Fund sources → appropriations → disbursements, plus revenues. Totals are
  // kept consistent: appropriation.disbursed_amount = sum of its
  // disbursements; fund current_balance = opening balance + revenues − disbursements.
  const Y = TODAY.getFullYear();
  const yearStart = new Date(Y, 0, 1);
  const fundDefs = [
    { key: "GF", name: `General Fund ${Y}`, code: `GF-${Y}`, statutory_rule: "Regular operating fund of the barangay (RA 7160)", opening: 1_250_000 },
    { key: "DF", name: "20% Development Fund", code: `DF-${Y}`, statutory_rule: "At least 20% of the NTA share for development projects (Sec. 287, RA 7160)", opening: 680_000 },
    { key: "SK", name: "SK Fund", code: `SK-${Y}`, statutory_rule: "10% of the barangay general fund for the Sangguniang Kabataan (RA 10742)", opening: 160_000 },
    { key: "DRRM", name: "BDRRM Fund", code: `DRRM-${Y}`, statutory_rule: "Not less than 5% of estimated regular revenue for disaster risk reduction (RA 10121)", opening: 210_000 },
    { key: "GAD", name: "GAD Fund", code: `GAD-${Y}`, statutory_rule: "At least 5% of the budget for gender and development programs", opening: 95_000 },
  ] as const;
  const funds = await prisma.fundSource.createManyAndReturn({
    data: [
      ...fundDefs.map((f) => ({ name: f.name, code: f.code, statutory_rule: f.statutory_rule, status: "ACTIVE" as const, original_balance: new Prisma.Decimal(f.opening), current_balance: new Prisma.Decimal(f.opening), recorded_by: secretary.id, created_at: at(yearStart, 9) })),
      { name: `General Fund ${Y - 1}`, code: `GF-${Y - 1}`, statutory_rule: "Prior-year operating fund (closed)", status: "INACTIVE" as const, original_balance: new Prisma.Decimal(1_100_000), current_balance: new Prisma.Decimal(0), recorded_by: secretary.id, created_at: at(new Date(Y - 1, 0, 1), 9) },
    ],
  });
  const fund = Object.fromEntries(fundDefs.map((f, i) => [f.key, funds[i]])) as Record<(typeof fundDefs)[number]["key"], (typeof funds)[number]>;
  const fundTotals = new Map<number, { rev: number; dis: number }>(funds.map((f) => [f.id, { rev: 0, dis: 0 }]));

  // Revenues for this year, month by month.
  const revenueRows: Prisma.RevenueCreateManyInput[] = [];
  let orNo = 4_520_100;
  for (let mo = 0; mo <= TODAY.getMonth(); mo++) {
    const monthEnd = mo === TODAY.getMonth() ? TODAY : new Date(Y, mo + 1, 0);
    const add = (source: string, category: string, account: string, amount: number, fundKey: keyof typeof fund, d: number) => {
      const date = clampPast(at(new Date(Y, mo, Math.min(d, monthEnd.getDate())), 10));
      revenueRows.push({ amount: new Prisma.Decimal(amount), date, source, category, income_account: account, fund_source_id: fund[fundKey].id, or_number: String(orNo++), recorded_by: secretary.id, created_at: date });
      fundTotals.get(fund[fundKey].id)!.rev += amount;
    };
    const nta = money(395_000, 405_000, 100);
    add("Department of Budget and Management", "National Tax Allotment", "Share from National Tax Allotment", Math.round(nta * 0.55), "GF", 5);
    add("Department of Budget and Management", "National Tax Allotment", "Share from National Tax Allotment", Math.round(nta * 0.2), "DF", 5);
    add("Department of Budget and Management", "National Tax Allotment", "Share from National Tax Allotment", Math.round(nta * 0.1), "SK", 5);
    add("Department of Budget and Management", "National Tax Allotment", "Share from National Tax Allotment", Math.round(nta * 0.05), "DRRM", 5);
    add("Department of Budget and Management", "National Tax Allotment", "Share from National Tax Allotment", Math.round(nta * 0.05), "GAD", 5);
    add("City Treasurer's Office", "Real Property Tax", "Share from Real Property Tax", money(mo < 3 ? 40_000 : 12_000, mo < 3 ? 65_000 : 22_000), "GF", 18);
    add("City Treasurer's Office", "Community Tax", "Share from Community Tax", money(3_000, mo < 3 ? 14_000 : 6_000), "GF", 18);
    add("Barangay Hall Cashier", "Clearance & Certification Fees", "Clearance and Certification Fees", money(10_000, 21_000), "GF", 28);
    add("Barangay Hall Cashier", "Business Permit Fees", "Permit Fees", mo === 0 ? money(38_000, 52_000) : money(2_500, 8_000), "GF", 25);
    add("Public market stalls", "Rental Income", "Rent Income", money(12_000, 15_500), "GF", 10);
  }
  await prisma.revenue.createMany({ data: revenueRows });

  // Appropriations (this year's budget) and their disbursements.
  const PAYEES = ["Danao Office Supplies Trading", "VECO Electric (Visayan Electric Co.)", "Metro Danao Water District", "Petron Station - Quisol", "JMT Construction & Supply", "Cebu Rescue Equipment Corp.", "Camotes Catering Services"];
  type ApprDef = { item: string; cat: "PS" | "MOOE" | "CO"; amount: number; fundKey: keyof typeof fund; payee: string; pattern: "monthly" | "quarterly" | "progress" | "once" | "none"; startMonth?: number };
  const officialsPayee = `Officials of Brgy. Quisol (c/o ${treasurerName})`;
  const apprDefs: ApprDef[] = [
    { item: "Honoraria – Punong Barangay and Sangguniang Barangay", cat: "PS", amount: 1_560_000, fundKey: "GF", payee: officialsPayee, pattern: "monthly" },
    { item: "Honoraria – Barangay Tanods (20)", cat: "PS", amount: 720_000, fundKey: "GF", payee: "Barangay Tanods", pattern: "monthly" },
    { item: "Honoraria – Barangay Health Workers and BNS", cat: "PS", amount: 288_000, fundKey: "GF", payee: "BHWs / BNS", pattern: "monthly" },
    { item: "Cash gift and year-end bonus", cat: "PS", amount: 210_000, fundKey: "GF", payee: officialsPayee, pattern: "none" },
    { item: "Office supplies", cat: "MOOE", amount: 150_000, fundKey: "GF", payee: PAYEES[0], pattern: "quarterly" },
    { item: "Electricity", cat: "MOOE", amount: 156_000, fundKey: "GF", payee: PAYEES[1], pattern: "monthly" },
    { item: "Water", cat: "MOOE", amount: 36_000, fundKey: "GF", payee: PAYEES[2], pattern: "monthly" },
    { item: "Fuel, oil and lubricants", cat: "MOOE", amount: 96_000, fundKey: "GF", payee: PAYEES[3], pattern: "monthly" },
    { item: "Peace and order program", cat: "MOOE", amount: 120_000, fundKey: "GF", payee: "Various suppliers", pattern: "quarterly" },
    { item: "Solid waste management", cat: "MOOE", amount: 90_000, fundKey: "GF", payee: "Various suppliers", pattern: "quarterly" },
    { item: "Health and nutrition program (feeding)", cat: "MOOE", amount: 110_000, fundKey: "GAD", payee: PAYEES[6], pattern: "quarterly" },
    { item: "Women's livelihood training", cat: "MOOE", amount: 60_000, fundKey: "GAD", payee: "TESDA-accredited trainer", pattern: "once", startMonth: 7 },
    { item: "SK sports league and youth development", cat: "MOOE", amount: 180_000, fundKey: "SK", payee: "SK Federation suppliers", pattern: "once", startMonth: 4 },
    { item: "Disaster preparedness training and drills", cat: "MOOE", amount: 80_000, fundKey: "DRRM", payee: "Danao CDRRMO", pattern: "once", startMonth: 5 },
    { item: "Concreting of Purok III farm-to-market road (250 m)", cat: "CO", amount: 1_200_000, fundKey: "DF", payee: PAYEES[4], pattern: "progress", startMonth: 2 },
    { item: "Solar streetlights, Purok IV (15 units)", cat: "CO", amount: 375_000, fundKey: "DF", payee: PAYEES[4], pattern: "once", startMonth: 6 },
    { item: "Multi-purpose hall roof repair", cat: "CO", amount: 450_000, fundKey: "DF", payee: PAYEES[4], pattern: "none" },
    { item: "Rescue equipment (rubber boat, life vests)", cat: "CO", amount: 150_000, fundKey: "DRRM", payee: PAYEES[5], pattern: "once", startMonth: 3 },
  ];
  const disbRows: Prisma.DisbursementCreateManyInput[] = [];
  let checkNo = 1_208_401;
  const apprRows: Prisma.AppropriationCreateManyInput[] = [];
  const disbursedPer: number[] = [];
  const thisMonth = TODAY.getMonth();
  for (const [ai, a] of apprDefs.entries()) {
    const pays: { month: number; amount: number }[] = [];
    if (a.pattern === "monthly") for (let mo = 0; mo <= thisMonth; mo++) pays.push({ month: mo, amount: Math.round((a.amount / 12) * (0.92 + rand() * 0.12)) });
    if (a.pattern === "quarterly") for (let mo = 0; mo <= thisMonth; mo += 3) pays.push({ month: mo, amount: Math.round((a.amount / 4) * (0.85 + rand() * 0.15)) });
    // One-off purchases/activities: most are paid in full (COMPLETED), some came in under budget.
    if (a.pattern === "once" && (a.startMonth ?? 0) <= thisMonth) pays.push({ month: a.startMonth ?? 0, amount: chance(0.7) ? a.amount : Math.round(a.amount * (0.9 + rand() * 0.07)) });
    if (a.pattern === "progress") {
      // 15% mobilization, then progress billings (30% / 30%), retention unpaid.
      const s = a.startMonth ?? 0;
      for (const [k, pct] of [[0, 0.15], [2, 0.3], [4, 0.3]] as const) if (s + k <= thisMonth) pays.push({ month: s + k, amount: Math.round(a.amount * pct) });
    }
    let sum = 0;
    for (const p of pays) {
      const monthEnd = p.month === thisMonth ? TODAY : new Date(Y, p.month + 1, 0);
      const date = clampPast(at(new Date(Y, p.month, Math.min(a.cat === "PS" ? 15 : int(8, 25), monthEnd.getDate())), 14));
      disbRows.push({ amount: new Prisma.Decimal(p.amount), date, payee: a.payee, particular: `${a.item} — ${date.toLocaleString("en-US", { month: "long" })} ${Y}`, item: a.item, check_number: String(checkNo++), fund_source_id: fund[a.fundKey].id, recorded_by: secretary.id, created_at: date, appropriation_id: ai /* fixed below */ });
      sum += p.amount;
    }
    disbursedPer.push(sum);
    fundTotals.get(fund[a.fundKey].id)!.dis += sum;
    const obligated = a.pattern === "none" ? (chance(0.5) ? Math.round(a.amount * 0.4) : 0) : a.pattern === "progress" ? a.amount : Math.max(sum, Math.round(a.amount * ((thisMonth + 1) / 12)));
    apprRows.push({
      item_name: a.item,
      category: a.cat,
      appropriated_amount: new Prisma.Decimal(a.amount),
      obligated_amount: new Prisma.Decimal(Math.min(obligated, a.amount)),
      disbursed_amount: new Prisma.Decimal(sum),
      payee: a.payee,
      status: sum >= a.amount * 0.98 || (a.pattern === "once" && sum > 0) ? "COMPLETED" : sum > 0 || obligated > 0 ? "APPROVED" : "PENDING",
      fund_source_id: fund[a.fundKey].id,
      recorded_by: secretary.id,
      created_at: at(yearStart, 10),
    });
  }
  const appropriations = await prisma.appropriation.createManyAndReturn({ data: apprRows });
  await prisma.disbursement.createMany({ data: disbRows.map((d) => ({ ...d, appropriation_id: appropriations[d.appropriation_id as number].id })) });
  for (const f of funds) {
    if (f.status !== "ACTIVE") continue;
    const t = fundTotals.get(f.id)!;
    await prisma.fundSource.update({ where: { id: f.id }, data: { current_balance: new Prisma.Decimal(Number(f.original_balance) + t.rev - t.dis) } });
  }
  console.log(`🏦 ${funds.length} fund sources, ${appropriations.length} appropriations, ${revenueRows.length} revenues, ${disbRows.length} disbursements`);

  // ── 17. MEETINGS, AGENDA, CALENDAR ───────────────────────────────────────
  const meetingDrafts: { data: Prisma.MeetingRecordCreateManyInput; agenda: string[] }[] = [];
  const firstMonday = (y: number, m: number, nth: number) => {
    const d = new Date(y, m, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (nth - 1) * 7);
    return d;
  };
  const SB_AGENDA = [
    "Approval of the minutes of the previous session", "Treasurer's report", "Peace and order situation report",
    "Proposed ordinance on stray animals", "Updates on the Purok III road concreting", "Solid waste management enforcement",
    "Preparations for the barangay fiesta", "BDRRM preparedness for typhoon season", "Request for financial assistance from residents",
    "Supplemental budget for health programs", "SK program proposals", "Barangay Annual Investment Program",
  ];
  for (let m = -12; m <= 1; m++) {
    const y = TODAY.getFullYear(), mo = TODAY.getMonth() + m;
    for (const nth of [1, 3]) {
      const date = at(firstMonday(y, mo, nth), 14);
      const past = date < NOW;
      meetingDrafts.push({
        data: {
          meeting_type: "SB_MEETING",
          title: `Regular Session — ${date.toLocaleString("en-US", { month: "long", year: "numeric" })} (${nth === 1 ? "1st" : "2nd"})`,
          meeting_date: date,
          location: "Barangay Session Hall",
          status: past ? (chance(0.05) ? "CANCELLED" : "COMPLETED") : "SCHEDULED",
          minutes: past ? `Called to order at 2:05 PM by the Punong Barangay, ${captainName}. Quorum present. Items discussed as listed in the agenda; resolutions approved by majority vote. Adjourned at 4:10 PM.` : null,
          recorded_by: secretary.id,
          created_at: addDays(date, -7),
        },
        agenda: [SB_AGENDA[0], SB_AGENDA[1], ...shuffle(SB_AGENDA.slice(2)).slice(0, int(1, 3))],
      });
    }
  }
  // Barangay Assembly Days: last Saturday of March and second Sunday of October.
  for (const y of [TODAY.getFullYear() - 1, TODAY.getFullYear()]) {
    const march = new Date(y, 2, 31);
    while (march.getDay() !== 6) march.setDate(march.getDate() - 1);
    const oct = new Date(y, 9, 1);
    while (oct.getDay() !== 0) oct.setDate(oct.getDate() + 1);
    oct.setDate(oct.getDate() + 7);
    for (const [date, label] of [[march, "1st Semester"], [oct, "2nd Semester"]] as const) {
      const when = at(date, 8);
      if (when < SEED_START) continue;
      const past = when < NOW;
      meetingDrafts.push({
        data: {
          meeting_type: "BARANGAY_ASSEMBLY",
          title: `Barangay Assembly — ${label} ${y}`,
          meeting_date: when,
          location: "Barangay Covered Court",
          status: past ? "COMPLETED" : "SCHEDULED",
          minutes: past ? `State of the Barangay Address delivered by ${captainName}. Financial report presented by the treasurer. Residents raised concerns on drainage, streetlights and stray dogs. Attendance: ${int(140, 260)} residents.` : null,
          recorded_by: secretary.id,
          created_at: addDays(when, -14),
        },
        agenda: ["State of the Barangay Address", "Financial report", "Committee reports", "Open forum"],
      });
    }
  }
  meetingDrafts.sort((a, b) => (a.data.meeting_date as Date).getTime() - (b.data.meeting_date as Date).getTime());
  const meetings = await prisma.meetingRecord.createManyAndReturn({ data: meetingDrafts.map((d) => d.data) });
  const agendaRows: Prisma.AgendaItemCreateManyInput[] = [];
  meetings.forEach((mt, i) => {
    meetingDrafts[i].agenda.forEach((title, k) => {
      agendaRows.push({
        meeting_id: mt.id,
        title,
        sort_order: k,
        status: mt.status === "COMPLETED" ? (k <= 1 ? "APPROVED" : weighted([["APPROVED", 5], ["DISCUSSED", 5]] as const)) : "PENDING",
        minutes: mt.status === "COMPLETED" ? pick(["Approved as presented.", "Discussed; for further study by the committee.", "Approved with amendments.", "Noted."]) : null,
      });
    });
  });
  await prisma.agendaItem.createMany({ data: agendaRows });

  const eventRows: Prisma.CalendarEventCreateManyInput[] = meetings.map((mt) => ({
    title: mt.title ?? (mt.meeting_type === "SB_MEETING" ? "SB Regular Session" : "Barangay Assembly"),
    description: mt.location,
    event_date: mt.meeting_date,
    event_type: mt.meeting_type === "SB_MEETING" ? "Meeting" : "Assembly",
    meeting_id: mt.id,
    created_by: secretary.id,
  }));
  // Philippine holidays for this year and next (fixed dates, Holy Week, National Heroes Day).
  function easter(y: number) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  for (const y of [TODAY.getFullYear(), TODAY.getFullYear() + 1]) {
    const lastMondayAug = new Date(y, 7, 31);
    while (lastMondayAug.getDay() !== 1) lastMondayAug.setDate(lastMondayAug.getDate() - 1);
    const holidays: [Date, string][] = [
      [new Date(y, 0, 1), "New Year's Day"], [addDays(easter(y), -3), "Maundy Thursday"], [addDays(easter(y), -2), "Good Friday"],
      [new Date(y, 3, 9), "Araw ng Kagitingan"], [new Date(y, 4, 1), "Labor Day"], [new Date(y, 5, 12), "Independence Day"],
      [new Date(y, 7, 21), "Ninoy Aquino Day"], [lastMondayAug, "National Heroes Day"], [new Date(y, 10, 1), "All Saints' Day"],
      [new Date(y, 10, 30), "Bonifacio Day"], [new Date(y, 11, 8), "Feast of the Immaculate Conception"],
      [new Date(y, 11, 25), "Christmas Day"], [new Date(y, 11, 30), "Rizal Day"],
    ];
    for (const [date, title] of holidays) eventRows.push({ title, event_date: at(date, 0), event_type: "Holiday", created_by: admin.id });
  }
  for (let q = -3; q <= 1; q++) {
    const qEnd = new Date(TODAY.getFullYear(), Math.floor(TODAY.getMonth() / 3) * 3 + q * 3 + 3, 0);
    eventRows.push({ title: "Submit quarterly accomplishment report to the City DILG", event_date: at(qEnd, 17), event_type: "Deadline", created_by: secretary.id });
  }
  eventRows.push(
    { title: "Operation Timbang Plus (child weighing)", description: "All children 0–59 months, per purok", event_date: at(new Date(TODAY.getFullYear(), 1, 10), 8), event_type: "Announcement", created_by: bhw.id },
    { title: "Purok clean-up drive", description: "Bring sacks and gloves. Meet at the purok center.", event_date: at(addDays(TODAY, 7), 6), event_type: "Announcement", created_by: secretary.id },
    { title: "Anti-rabies vaccination for dogs and cats", event_date: at(addDays(TODAY, 12), 8), event_type: "Announcement", created_by: bhw.id },
    { title: "Senior citizens' social pension payout", event_date: at(addDays(TODAY, 18), 9), event_type: "Announcement", created_by: secretary.id },
  );
  await prisma.calendarEvent.createMany({ data: eventRows });
  console.log(`📅 ${meetings.length} meetings, ${agendaRows.length} agenda items, ${eventRows.length} calendar events`);

  // ── 18. BARANGAY IDs ─────────────────────────────────────────────────────
  // Valid for 3 years in the app, so IDs issued 3+ years ago show as expired.
  const idHolders = shuffle(livingAdults).slice(0, 75);
  const idDrafts = idHolders.map((x) => ({ resident_id: x.r.id, issued_date: officeTime(yearsAgo(4), TODAY), issued_by: pick(deskStaff) }));
  idDrafts.sort((a, b) => a.issued_date.getTime() - b.issued_date.getTime());
  const idsPerYear = new Map<number, number>();
  await prisma.barangayId.createMany({
    data: idDrafts.map((d) => {
      const y = d.issued_date.getFullYear();
      const n = (idsPerYear.get(y) ?? 0) + 1;
      idsPerYear.set(y, n);
      return { ...d, id_number: `BRG-${y}-${String(n).padStart(4, "0")}` };
    }),
  });
  console.log(`🪪 ${idDrafts.length} barangay IDs`);

  // ── 19. VISITOR LOG ───────────────────────────────────────────────────────
  const VISIT_PURPOSES = [
    ["Request barangay clearance", "Barangay Secretary"], ["Request certificate of indigency", "Barangay Secretary"],
    ["File a complaint (blotter)", "Lupon Tagapamayapa Chairperson"], ["Attend Lupon hearing", "Lupon Tagapamayapa Chairperson"],
    ["Pay business permit fee", "Barangay Treasurer"], ["Courtesy call", "Punong Barangay"], ["Senior citizen ID inquiry", "Barangay Secretary"],
    ["4Ps compliance update", "Barangay Secretary"], ["Borrow chairs and tent", "Barangay Secretary"], ["Prenatal checkup schedule", "BHW Coordinator"],
    ["Deliver office supplies", "Barangay Treasurer"], ["Inquiry on financial assistance (AICS)", "Punong Barangay"],
  ] as const;
  const visitorRows: Prisma.VisitorLogCreateManyInput[] = [];
  for (let d = 45; d >= 1; d--) {
    const day = daysAgo(d);
    if (isWeekend(day)) continue;
    for (let i = 0; i < int(3, 9); i++) {
      const [purpose, person] = pick(VISIT_PURPOSES);
      const time_in = at(day, int(8, 16), int(0, 59));
      const visitor = chance(0.8) ? fullName(pick(livingAdults).r) : `${firstName(chance(0.5) ? "MALE" : "FEMALE")} ${pick(SURNAMES)}`;
      visitorRows.push({ visitor_name: visitor, contact: chance(0.6) ? mobile() : null, purpose, person_to_visit: person, time_in, time_out: addMinutes(time_in, int(8, 95)), recorded_by: pick(deskStaff), created_at: time_in });
    }
  }
  // Two visitors still inside right now, for the "active visitors" tile.
  for (const mins of [35, 10]) {
    const [purpose, person] = pick(VISIT_PURPOSES);
    const time_in = addMinutes(NOW, -mins);
    visitorRows.push({ visitor_name: fullName(pick(livingAdults).r), contact: mobile(), purpose, person_to_visit: person, time_in, time_out: null, recorded_by: encoder.id, created_at: time_in });
  }
  await prisma.visitorLog.createMany({ data: visitorRows });
  console.log(`🚪 ${visitorRows.length} visitor log entries`);

  // ── 20. SETTINGS ──────────────────────────────────────────────────────────
  const settings = [
    { key: "barangay_name", value: "Brgy. Quisol" },
    { key: "municipality", value: "Danao City" },
    { key: "province", value: "Cebu" },
    { key: "region", value: "Region VII" },
    { key: "zip_code", value: "6004" },
    { key: "contact_number", value: "0917-000-0000" },
    { key: "captain_name", value: captainName },
    { key: "secretary_name", value: secretaryName },
  ];
  await prisma.systemSetting.createMany({ data: settings });

  // ── 21. AUDIT TRAIL ───────────────────────────────────────────────────────
  // A believable history: user setup, resident encoding, releases, cases, edits.
  const auditRows: Prisma.AuditLogCreateManyInput[] = [];
  for (const u of users.filter((u) => u.id !== admin.id)) {
    auditRows.push({ user_id: admin.id, action: "CREATE", table_affected: "User", record_id: u.id, details: `Created user: ${u.username} (${u.role})`, performed_at: monthsAgo(23) });
  }
  for (const { r } of shuffle(withMeta).slice(0, 60)) {
    auditRows.push({ user_id: pick(deskStaff), action: "CREATE", table_affected: "Resident", record_id: r.id, details: `Created resident: ${fullName(r)}`, performed_at: r.created_at });
  }
  for (const hh of households) {
    auditRows.push({ user_id: pick(deskStaff), action: "CREATE", table_affected: "Household", record_id: hh.id, details: `Created household ${hh.household_no}`, performed_at: hh.created_at });
  }
  for (const c of shuffle(certificates.filter((c) => c.status === "RELEASED")).slice(0, 80)) {
    auditRows.push({ user_id: c.issued_by, action: "UPDATE", table_affected: "Certificate", record_id: c.id, details: `Released ${c.certificate_type} certificate ${c.certificate_no}`, performed_at: c.issued_at! });
  }
  for (const c of cases) {
    auditRows.push({ user_id: secretary.id, action: "CREATE", table_affected: "BlotterCase", record_id: c.id, details: `Filed blotter case ${c.case_number} (${c.incident_type})`, performed_at: c.created_at });
  }
  for (const mt of meetings.filter((m) => m.status === "COMPLETED").slice(-10)) {
    auditRows.push({ user_id: secretary.id, action: "UPDATE", table_affected: "MeetingRecord", record_id: mt.id, details: `Recorded minutes: ${mt.title}`, performed_at: addDays(mt.meeting_date, 1) });
  }
  for (const { r } of shuffle(livingAdults).slice(0, 25)) {
    auditRows.push({ user_id: pick(deskStaff), action: "UPDATE", table_affected: "Resident", record_id: r.id, details: `Updated resident: ${fullName(r)} (${pick(["contact number", "employment status", "address", "voter status"])})`, performed_at: officeTime(r.created_at, TODAY) });
  }
  auditRows.push({ user_id: admin.id, action: "UPDATE", table_affected: "System", details: "Updated general settings (barangay information)", performed_at: monthsAgo(22) });
  auditRows.sort((a, b) => (a.performed_at as Date).getTime() - (b.performed_at as Date).getTime());
  await prisma.auditLog.createMany({ data: auditRows });
  console.log(`📝 ${auditRows.length} audit log entries`);

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete!");
  console.log(`   Accounts: ${ACCOUNTS.map((a) => a.username).join(", ")}`);
  console.log("   Passwords are in the ACCOUNTS list in prisma/migrations/seed.ts (not printed here).\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());