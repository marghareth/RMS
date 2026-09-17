// FILE: tests/integration/setup/env.ts
//
// Minimal .env file loader — deliberately dependency-free (no `dotenv`
// package) since this is the only place in the project that would need
// one. Values already present in `process.env` (e.g. injected by CI, or
// exported in your shell) always win over the file, matching standard
// dotenv precedence.

import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}