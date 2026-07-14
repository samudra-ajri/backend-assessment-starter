import Database from "better-sqlite3";
import crypto from "crypto";
import { config } from "./config";

export const db = new Database(config.dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

/**
 * Hash a password with a random 16-byte salt using scrypt.
 * Returns "salt:hash" (both hex-encoded).
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored "salt:hash" string.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

// Seed default users if table is empty
const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
if (count.c === 0) {
  db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(
    "alice@example.com",
    hashPassword("password1")
  );
  db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(
    "bob@example.com",
    hashPassword("password2")
  );
  db.prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)").run(
    1,
    "Alice note",
    "private thoughts"
  );
  db.prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)").run(
    2,
    "Bob note",
    "bob's secrets"
  );
}
