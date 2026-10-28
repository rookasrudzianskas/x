import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { getDatabase } from "./db";
import {
  equalHashes,
  hashOtp,
  issueOtp,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
} from "./otp";
import { rateLimit } from "./rate-limit";
import { bookingSchema, creatorSchema, reportSchema } from "./schemas";
import { json, readJson, requireSameOrigin } from "./http";
import {
  verifyAndCreateSession,
  getUser,
  logout,
  SESSION_COOKIE,
} from "./auth";
import { findReport, getBoard, saveReport } from "./reports";
import { DEFAULT_ESTIMATE_INPUT } from "../estimate";

async function consumeOtp(email: string, code: string, now = Date.now()) {
  return !!(await verifyAndCreateSession(
    email,
    code,
    new Request("https://worth.example"),
    json({}),
    now,
  ));
}

beforeAll(() => {
  vi.stubEnv("DATABASE_URL", "file::memory:");
  vi.stubEnv(
    "AUTH_SECRET",
    "test-secret-that-is-at-least-thirty-two-characters",
  );
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://worth.example");
});
afterAll(async () => {
  (await getDatabase()).close();
  vi.unstubAllEnvs();
});

describe("one-time email codes", () => {
  it("stores a salted hash, binds it to the email and consumes a code only once", async () => {
    const email = "one@example.com";
    const { code, salt } = await issueOtp(email, 1_000);
    expect(code).toMatch(/^\d{6}$/);
    const row = (
      await (
        await getDatabase()
      ).execute({ sql: "SELECT * FROM otp_codes WHERE email=?", args: [email] })
    ).rows[0];
    expect(row.code_hash).not.toEqual(code);
    expect(String(row.code_hash)).toHaveLength(64);
    expect(hashOtp("someoneelse@example.com", code, salt)).not.toBe(
      row.code_hash,
    );
    expect(await consumeOtp(email, code, 1_001)).toBe(true);
    expect(await consumeOtp(email, code, 1_002)).toBe(false);
  });

  it("expires at the exact deadline and rejects a code after five failed attempts", async () => {
    const expired = await issueOtp("expired@example.com", 1_000);
    expect(
      await consumeOtp("expired@example.com", expired.code, 1_000 + OTP_TTL_MS),
    ).toBe(false);
    const locked = await issueOtp("locked@example.com", 1_000);
    const wrong = locked.code === "000000" ? "000001" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++)
      expect(await consumeOtp("locked@example.com", wrong, 1_001)).toBe(false);
    expect(await consumeOtp("locked@example.com", locked.code, 1_002)).toBe(
      false,
    );
  });

  it("rotates the salt when a new code is issued and safely rejects malformed hashes", async () => {
    const first = await issueOtp("rotate@example.com");
    const second = await issueOtp("rotate@example.com");
    expect(first.salt).not.toBe(second.salt);
    expect(equalHashes("not-hex", "also-not-hex")).toBe(false);
    expect(
      equalHashes(
        hashOtp("rotate@example.com", second.code, first.salt),
        hashOtp("rotate@example.com", second.code, second.salt),
      ),
    ).toBe(false);
  });

  it("accepts only one of two simultaneous verifications", async () => {
    const { code } = await issueOtp("race@example.com");
    const results = await Promise.all([
      consumeOtp("race@example.com", code),
      consumeOtp("race@example.com", code),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("persistent throttling", () => {
  it("allows only the configured count under concurrent requests and resets at its deadline", async () => {
    const key = randomUUID();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => rateLimit(key, 3, 1_000, 10_000)),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(3);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(2);
    await expect(rateLimit(key, 3, 1_000, 11_000)).resolves.toBeUndefined();
    await expect(
      rateLimit(`${key}-different`, 3, 1_000, 10_000),
    ).resolves.toBeUndefined();
  });
});

describe("request boundaries", () => {
  it("requires the actual configured origin for mutations", () => {
    expect(() =>
      requireSameOrigin(
        new Request("https://worth.example/api/reports", {
          headers: { origin: "https://worth.example" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      requireSameOrigin(new Request("https://worth.example/api/reports")),
    ).toThrow();
    expect(() =>
      requireSameOrigin(
        new Request("https://worth.example/api/reports", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      requireSameOrigin(
        new Request("https://worth.example/api/reports", {
          headers: {
            origin: "https://worth.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toThrow();
  });

  it("bounds bodies without relying on Content-Length and handles malformed JSON", async () => {
    const request = (body: string) =>
      new Request("https://worth.example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    await expect(
      readJson(
        request(JSON.stringify({ text: "a".repeat(17_000) })),
        z.object({ text: z.string() }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readJson(request("{"), z.object({ text: z.string() })),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("normalizes email/handles, defaults reports to unlisted and rejects privilege fields", () => {
    const report = reportSchema.parse({
      handle: "@Test_User",
      input: DEFAULT_ESTIMATE_INPUT,
    });
    expect(report.handle).toBe("Test_User");
    expect(report.publish).toBe(false);
    expect(reportSchema.safeParse({ ...report, admin: true }).success).toBe(
      false,
    );
    const booking = bookingSchema.parse({
      name: "Test",
      email: "TEST@EXAMPLE.COM",
      company: "Example",
      budget: "500–1000",
      message: "A useful campaign brief.",
    });
    expect(booking.email).toBe("test@example.com");
    expect(bookingSchema.safeParse({ ...booking, message: "" }).success).toBe(
      false,
    );
    expect(
      creatorSchema.safeParse({
        profile: {
          name: "Test",
          handle: "test",
          platform: "linkedin",
          published: true,
        },
      }).success,
    ).toBe(false);
    expect(
      creatorSchema.safeParse({
        profile: { name: "Test", handle: "test", handleVerified: true },
      }).success,
    ).toBe(false);
  });
});

describe("server sessions", () => {
  it("uses an opaque hashed token, secure HttpOnly cookie, and revokes on logout", async () => {
    const response = json({});
    const { code } = await issueOtp("session@example.com");
    const user = await verifyAndCreateSession(
      "session@example.com",
      code,
      new Request("https://worth.example"),
      response,
    );
    const cookie = response.cookies.get(SESSION_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    const request = new Request("https://worth.example", {
      headers: { cookie: `${SESSION_COOKIE}=${cookie.value}` },
    });
    expect(await getUser(request)).toEqual(user);
    const stored = (
      await (await getDatabase()).execute("SELECT token_hash FROM sessions")
    ).rows;
    expect(stored.some((row) => row.token_hash === cookie.value)).toBe(false);
    const result = json({});
    await logout(request, result);
    expect(await getUser(request)).toBeNull();
    expect(result.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });
});

describe("report privacy and board", () => {
  it("persists unlisted reports without adding them to the board", async () => {
    const report = await saveReport({
      handle: "unlisted_test",
      input: DEFAULT_ESTIMATE_INPUT,
      publish: false,
    });
    expect(await findReport(report.id)).toEqual(report);
    expect(
      (await getBoard("recent", 100, 0)).profiles.some(
        (profile) => profile.handle === "unlisted_test",
      ),
    ).toBe(false);
  });

  it("deduplicates published handles case-insensitively and keeps the latest report", async () => {
    await saveReport({
      handle: "Public_Test",
      name: "First",
      input: DEFAULT_ESTIMATE_INPUT,
      publish: true,
    });
    const updated = await saveReport({
      handle: "public_test",
      name: "Updated",
      input: DEFAULT_ESTIMATE_INPUT,
      publish: true,
    });
    const profiles = (await getBoard("recent", 100, 0)).profiles.filter(
      (profile) => profile.handle.toLowerCase() === "public_test",
    );
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe("Updated");
    expect(profiles[0].reportId).toBe(updated.id);
    expect(JSON.stringify(profiles)).not.toContain("@example.com");
  });

  it("returns stable sorted pages and report links independently of live X", async () => {
    const high = await saveReport({
      handle: "highest_test",
      input: { ...DEFAULT_ESTIMATE_INPUT, medianViews: 1_000_000 },
      publish: true,
    });
    const all = await getBoard("top", 100, 0);
    const first = await getBoard("top", 3, 0);
    const second = await getBoard("top", 3, 3);
    expect(first.total).toBe(all.total);
    expect(first.profiles).toEqual(all.profiles.slice(0, 3));
    expect(second.profiles).toEqual(all.profiles.slice(3, 6));
    expect(first.profiles[0].reportId).toBe(high.id);
    expect(
      (await findReport(first.profiles[0].reportId!))?.profile.handle,
    ).toBe("highest_test");
    expect((await getBoard("top", 8, all.total)).profiles).toEqual([]);
  });
});
