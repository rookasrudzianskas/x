import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { getDatabase } from "./db";
import { ApiError } from "./http";
import { authSecret, equalHashes, hashOtp, OTP_MAX_ATTEMPTS } from "./otp";

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

/** Redeem the code and persist the session in one transaction, or do neither. */
export async function verifyAndCreateSession(
  email: string,
  code: string,
  request: Request,
  response: NextResponse,
  now = Date.now(),
): Promise<User | null> {
  authSecret();
  const db = await getDatabase();
  const challenge = (
    await db.execute({
      sql: "SELECT salt,code_hash,expires_at,attempts,used_at FROM otp_codes WHERE email=?",
      args: [email],
    })
  ).rows[0];
  if (
    !challenge ||
    challenge.used_at !== null ||
    Number(challenge.expires_at) <= now ||
    Number(challenge.attempts) >= OTP_MAX_ATTEMPTS
  )
    return null;
  const salt = String(challenge.salt);
  const valid =
    /^\d{6}$/.test(code) &&
    equalHashes(hashOtp(email, code, salt), String(challenge.code_hash));
  if (!valid) {
    await db.execute({
      sql: "UPDATE otp_codes SET attempts=attempts+1 WHERE email=? AND salt=? AND used_at IS NULL AND expires_at>? AND attempts<?",
      args: [email, salt, now, OTP_MAX_ATTEMPTS],
    });
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenDigest = tokenHash(token);
  const eligible =
    "email=? AND salt=? AND code_hash=? AND used_at IS NULL AND expires_at>? AND attempts<?";
  const eligibilityArgs = [
    email,
    salt,
    String(challenge.code_hash),
    now,
    OTP_MAX_ATTEMPTS,
  ];
  const results = await db.batch(
    [
      {
        sql: `INSERT INTO users(id,email,created_at) SELECT ?,email,? FROM otp_codes WHERE ${eligible} ON CONFLICT(email) DO NOTHING`,
        args: [randomUUID(), now, ...eligibilityArgs],
      },
      {
        sql: `UPDATE otp_codes SET attempts=attempts+1, used_at=? WHERE ${eligible}`,
        args: [now, ...eligibilityArgs],
      },
      {
        // Keep this immediately after the conditional UPDATE. SQLite changes()
        // belongs to this batch's connection and gates the single winning request.
        sql: "INSERT INTO sessions(token_hash,user_id,expires_at) SELECT ?,id,? FROM users WHERE email=? AND changes()=1",
        args: [tokenDigest, now + SESSION_TTL_SECONDS * 1_000, email],
      },
      {
        sql: "SELECT users.id,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=?",
        args: [tokenDigest],
      },
    ],
    "write",
  );
  const row = results[3].rows[0];
  if (!row) return null;
  response.cookies.set(SESSION_COOKIE, token, {
    ...cookieOptions(request),
    maxAge: SESSION_TTL_SECONDS,
  });
  return { id: String(row.id), email: String(row.email) };
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
