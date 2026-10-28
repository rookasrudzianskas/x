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

export function generateOtp(email: string, now = Date.now()) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = randomBytes(24).toString("hex");
  const codeHash = hashOtp(email, code, salt);
  return { code, salt, codeHash, expiresAt: now + OTP_TTL_MS };
}

/** Called only after the email provider accepts the message. */
export async function storeOtp(
  email: string,
  challenge: ReturnType<typeof generateOtp>,
) {
  const db = await getDatabase();
  await db.execute({
    sql: `INSERT INTO otp_codes(email,salt,code_hash,expires_at,attempts,used_at) VALUES(?,?,?,?,0,NULL)
      ON CONFLICT(email) DO UPDATE SET salt=excluded.salt,code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,used_at=NULL
      WHERE otp_codes.expires_at <= excluded.expires_at`,
    args: [email, challenge.salt, challenge.codeHash, challenge.expiresAt],
  });
}

/** Internal setup helper; HTTP delivery uses generate → send → store. */
export async function issueOtp(email: string, now = Date.now()) {
  const challenge = generateOtp(email, now);
  await storeOtp(email, challenge);
  return { code: challenge.code, salt: challenge.salt };
}
