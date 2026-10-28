import "server-only";
import { createClient, type Client } from "@libsql/client";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

let database: Promise<Client> | undefined;

/** Lazy initialization keeps builds independent from database credentials. */
export function getDatabase(): Promise<Client> {
  if (!database)
    database = connect().catch((error) => {
      database = undefined;
      throw error;
    });
  return database;
}

async function connect() {
  const url = process.env.DATABASE_URL || "file:./data/worth.db";
  if (url.startsWith("file:") && !url.includes(":memory:")) {
    await mkdir(dirname(resolve(url.slice(5))), { recursive: true });
  }
  const db = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  try {
    await db.batch(
      [
        `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, handle TEXT NOT NULL, profile_json TEXT NOT NULL, estimate_json TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
        `CREATE INDEX IF NOT EXISTS reports_public ON reports(published, created_at DESC)`,
        `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS otp_codes (email TEXT PRIMARY KEY, salt TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS creator_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id), profile_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS creator_public_handles (handle_key TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id))`,
        `CREATE TABLE IF NOT EXISTS booking_requests (id TEXT PRIMARY KEY, request_json TEXT NOT NULL, created_at INTEGER NOT NULL)`,
      ],
      "write",
    );
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
