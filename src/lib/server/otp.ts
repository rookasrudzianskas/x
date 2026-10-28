import "server-only";
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { getDatabase } from "./db";
import { ApiError } from "./http";

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

export function authSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32)
    throw new ApiError(
      503,
      "not_configured",
      "Email sign-in is not configured yet.",
    );
  return value;
}

export function hashOtp(email: string, code: string, salt: string): string {
  return createHmac("sha256", authSecret())
    .update(`${email}\0${salt}\0${code}`)
    .digest("hex");
}

export function equalHashes(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right))
    return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export async function issueOtp(email: string, now = Date.now()) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = randomBytes(24).toString("hex");
  const codeHash = hashOtp(email, code, salt);
  const db = await getDatabase();
  await db.execute({
    sql: `INSERT INTO otp_codes(email,salt,code_hash,expires_at,attempts,used_at) VALUES(?,?,?,?,0,NULL)
      ON CONFLICT(email) DO UPDATE SET salt=excluded.salt,code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,used_at=NULL`,
    args: [email, salt, codeHash, now + OTP_TTL_MS],
  });
  return { code, salt };
}

export async function revokeOtp(email: string, salt: string) {
  await (
    await getDatabase()
  ).execute({
    sql: "DELETE FROM otp_codes WHERE email=? AND salt=?",
    args: [email, salt],
  });
}

/** A conditional atomic update makes successful verification single-use under races. */
export async function consumeOtp(
  email: string,
  code: string,
  now = Date.now(),
): Promise<boolean> {
  authSecret();
  const db = await getDatabase();
  const result = await db.execute({
    sql: "SELECT * FROM otp_codes WHERE email=?",
    args: [email],
  });
  const row = result.rows[0];
  if (
    !row ||
    row.used_at !== null ||
    Number(row.expires_at) <= now ||
    Number(row.attempts) >= OTP_MAX_ATTEMPTS
  )
    return false;
  const valid =
    /^\d{6}$/.test(code) &&
    equalHashes(hashOtp(email, code, String(row.salt)), String(row.code_hash));
  const updated = await db.execute({
    sql: `UPDATE otp_codes SET attempts=attempts+1, used_at=?
      WHERE email=? AND salt=? AND used_at IS NULL AND expires_at>? AND attempts<? RETURNING email`,
    args: [valid ? now : null, email, String(row.salt), now, OTP_MAX_ATTEMPTS],
  });
  return valid && updated.rows.length === 1;
}
