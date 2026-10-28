import "server-only";
import { createHash } from "node:crypto";
import { getDatabase } from "./db";
import { ApiError, clientKey } from "./http";

/** Atomic, persistent fixed-window limit; shared by every application instance. */
export async function rateLimit(
  key: string,
  maximum: number,
  windowMs: number,
  now = Date.now(),
) {
  const db = await getDatabase();
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const result = await db.execute({
    sql: `INSERT INTO rate_limits(key, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`,
    args: [hashedKey, now + windowMs, now, now],
  });
  const row = result.rows[0];
  if (Number(row.count) > maximum) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many requests. Please try again later.",
      Math.max(1, Math.ceil((Number(row.reset_at) - now) / 1_000)),
    );
  }
}

export function throttle(
  request: Request,
  route: string,
  maximum = 60,
  windowMs = 60_000,
) {
  return rateLimit(`${route}:${clientKey(request)}`, maximum, windowMs);
}
