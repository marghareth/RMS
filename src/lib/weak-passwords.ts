// FILE: src/lib/weak-passwords.ts
//
// Helpers for scripts/check-default-passwords.ts, which finds accounts that
// still have a default or easily guessed password and can reset them.
//
// The old seed script created six accounts with passwords like admin123 and
// captain123, so those are checked first, along with common weak passwords
// and "<username>123"-style patterns.
//
// Pure module: no Prisma and no Node-only imports, so it is easy to unit
// test and can also be used in the browser (src/lib/password-policy.ts
// shows the "not a common password" hint while the user types).
//
// Randomness comes from the Web Crypto API (globalThis.crypto), which is a
// cryptographically secure source in both Node 18+ and browsers. It used to
// be node:crypto's randomInt, which can't be bundled for the browser.

/** A uniform random integer in [0, max), without modulo bias. */
function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** The passwords the old seed script created. Never use these anywhere. */
export const LEGACY_SEED_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  captain: "captain123",
  secretary: "secretary123",
  kagawad1: "kagawad123",
  bhw1: "bhw123",
  encoder1: "encoder123",
};

/** Common weak passwords worth checking every account against. */
const COMMON_WEAK_PASSWORDS = [
  "password",
  "password123",
  "admin",
  "12345678",
  "123456789",
  "barangay",
  "barangay123",
  "changeme",
  "qwerty123",
];

/**
 * Every password the checker should try for one account: the old seed
 * passwords, common weak ones, and username-based patterns ("<username>123",
 * and the same with trailing digits removed, which is how kagawad1 got
 * "kagawad123").
 */
export function weakPasswordCandidates(username: string): string[] {
  const base = username.replace(/\d+$/, "");
  const candidates = new Set<string>([
    ...Object.values(LEGACY_SEED_PASSWORDS),
    ...COMMON_WEAK_PASSWORDS,
    username,
    `${username}123`,
    `${username}1234`,
    base,
    `${base}123`,
    `${base}1234`,
  ]);
  candidates.delete("");
  return [...candidates];
}

// No 0/O, 1/l/I — passwords are read off a terminal and typed by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * A random password from a cryptographically secure source, used when the
 * checker resets an account. Grouped as xxxx-xxxx-xxxx-xxxx so it's easy to
 * read aloud and type; 16 characters from a 56-letter alphabet is about 93
 * bits of entropy.
 */
export function generateStrongPassword(groups = 4, groupLength = 4): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let part = "";
    for (let i = 0; i < groupLength; i++) part += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(part);
  }
  return parts.join("-");
}

// Short, common words that are easy to say and spell. Used for temporary
// passwords, which an admin reads out or writes down for someone in person.
const EASY_WORDS = [
  "Apple", "Basket", "Beach", "Bridge", "Candle", "Cloud", "Coconut", "Corner", "Garden", "Guitar",
  "Harbor", "Island", "Jacket", "Kettle", "Ladder", "Lemon", "Mango", "Market", "Meadow", "Mirror",
  "Monkey", "Orange", "Paddle", "Papaya", "Parrot", "Pencil", "Pepper", "Pillow", "Planet", "Pocket",
  "Rabbit", "Ribbon", "River", "Rocket", "Saddle", "Silver", "Spoon", "Summer", "Sunset", "Ticket",
  "Tiger", "Tomato", "Tunnel", "Turtle", "Valley", "Velvet", "Wagon", "Window", "Winter", "Yellow",
];

/**
 * A temporary password that is easy to read out and type, like
 * "Mango-River-4827": two words, then four digits. It meets the password
 * rules (uppercase, lowercase, number, symbol, 10+ characters).
 *
 * That's about 25 bits of randomness, far less than generateStrongPassword,
 * which is fine for what it's used for: it only works for 30 minutes,
 * sign-in allows 5 wrong guesses per 15 minutes, and the user must replace
 * it straight away. Don't use it for anything long-lived.
 */
export function generateTemporaryPassword(): string {
  const first = EASY_WORDS[randomInt(EASY_WORDS.length)];
  let second = EASY_WORDS[randomInt(EASY_WORDS.length)];
  while (second === first) second = EASY_WORDS[randomInt(EASY_WORDS.length)];
  const digits = String(randomInt(10000)).padStart(4, "0");
  return `${first}-${second}-${digits}`;
}