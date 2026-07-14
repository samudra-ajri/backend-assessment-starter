import fs from "fs";
import path from "path";

// Load .env file if it exists (avoids needing dotenv as a dependency)
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const isTest = process.env.NODE_ENV === "test";

if (!process.env.JWT_SECRET && !isTest) {
  throw new Error("JWT_SECRET environment variable must be set");
}

export const config = {
  jwtSecret: process.env.JWT_SECRET || "test-secret-do-not-use-in-production",
  dbPath: process.env.DB_PATH || (isTest ? ":memory:" : "notes.db"),
  port: Number(process.env.PORT) || 3000,
};
