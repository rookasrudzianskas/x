import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { getDatabase } from "./db";
import { ApiError } from "./http";
import { authSecret } from "./otp";

export const SESSION_COOKIE = "worth_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export type User = { id: string; email: string };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readToken(request: Request): string | null {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const value = cookie?.slice(SESSION_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

function cookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).protocol ===
        "https:",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSession(
  email: string,
  request: Request,
  response: NextResponse,
) {
  authSecret();
  const db = await getDatabase();
  await db.execute({
    sql: "INSERT INTO users(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING",
    args: [randomUUID(), email, Date.now()],
  });
  const result = await db.execute({
    sql: "SELECT id,email FROM users WHERE email=?",
    args: [email],
  });
  const user = {
    id: String(result.rows[0].id),
    email: String(result.rows[0].email),
  };
  const token = randomBytes(32).toString("base64url");
  await db.execute({
    sql: "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
    args: [tokenHash(token), user.id, Date.now() + SESSION_TTL_SECONDS * 1_000],
  });
  response.cookies.set(SESSION_COOKIE, token, {
    ...cookieOptions(request),
    maxAge: SESSION_TTL_SECONDS,
  });
  return user;
}

export async function getUser(request: Request): Promise<User | null> {
  const token = readToken(request);
  if (!token) return null;
  const result = await (
    await getDatabase()
  ).execute({
    sql: "SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?",
    args: [tokenHash(token), Date.now()],
  });
  return result.rows[0]
    ? { id: String(result.rows[0].id), email: String(result.rows[0].email) }
    : null;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
  return user;
}

export async function logout(request: Request, response: NextResponse) {
  const token = readToken(request);
  if (token)
    await (
      await getDatabase()
    ).execute({
      sql: "DELETE FROM sessions WHERE token_hash=?",
      args: [tokenHash(token)],
    });
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(request),
    maxAge: 0,
  });
}
