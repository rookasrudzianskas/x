import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  PUT as putCreator,
  GET as getCreator,
  DELETE as deleteCreator,
} from "../../app/api/creator/route";
import { GET as getPublicCreator } from "../../app/api/creator/public/[handle]/route";
import { POST as postReport } from "../../app/api/reports/route";
import { POST as verifyCode } from "../../app/api/auth/verify/route";
import { POST as sendCode } from "../../app/api/auth/send-code/route";
import { getDatabase } from "./db";
import { createSession, SESSION_COOKIE } from "./auth";
import { issueOtp } from "./otp";
import { json } from "./http";
import { DEFAULT_ESTIMATE_INPUT } from "../estimate";

const origin = "https://worth.example";
function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
) {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function cookieFor(email: string) {
  const response = json({});
  await createSession(email, request("/api/auth/session"), response);
  return `${SESSION_COOKIE}=${response.cookies.get(SESSION_COOKIE)!.value}`;
}
function context(handle: string) {
  return { params: Promise.resolve({ handle }) };
}

beforeAll(() => {
  vi.stubEnv("DATABASE_URL", "file::memory:");
  vi.stubEnv(
    "AUTH_SECRET",
    "test-secret-that-is-at-least-thirty-two-characters",
  );
  vi.stubEnv("NEXT_PUBLIC_APP_URL", origin);
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No test may call an external provider.");
    }),
  );
});
afterAll(async () => {
  (await getDatabase()).close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("API authorization and validation", () => {
  it("rejects unauthenticated profile writes", async () => {
    const response = await putCreator(
      request("/api/creator", "PUT", {
        profile: { name: "Test", handle: "test" },
      }),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("unauthorized");
  });

  it("rejects foreign origins before storing a report", async () => {
    const response = await postReport(
      new Request(`${origin}/api/reports`, {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handle: "test", input: DEFAULT_ESTIMATE_INPUT }),
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("invalid_origin");
    expect(
      (
        await (
          await getDatabase()
        ).execute("SELECT count(*) AS total FROM reports")
      ).rows[0].total,
    ).toBe(0);
  });

  it("rejects invalid calculator inputs and oversized request bodies", async () => {
    const invalid = await postReport(
      request("/api/reports", "POST", {
        handle: "test",
        input: { ...DEFAULT_ESTIMATE_INPUT, cpm: -1 },
      }),
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).code).toBe("validation_error");
    const oversized = await postReport(
      request("/api/reports", "POST", {
        handle: "test",
        input: DEFAULT_ESTIMATE_INPUT,
        name: "a".repeat(17_000),
      }),
    );
    expect(oversized.status).toBe(413);
  });

  it("honestly rejects unconfigured email delivery without making external requests", async () => {
    const response = await sendCode(
      request("/api/auth/send-code", "POST", {
        email: "test@example.com",
        locale: "en",
      }),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("not_configured");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns secure session cookies after one valid OTP and rejects replay", async () => {
    const email = "route-login@example.com";
    const { code } = await issueOtp(email);
    const response = await verifyCode(
      request("/api/auth/verify", "POST", { email, code }),
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect((await response.json()).user.email).toBe(email);
    expect(
      (await verifyCode(request("/api/auth/verify", "POST", { email, code })))
        .status,
    ).toBe(400);
  });
});

describe("public creator privacy", () => {
  it("hides drafts, exposes only allowed published fields, preserves handle uniqueness and unpublishes", async () => {
    const cookie = await cookieFor("owner@example.com");
    const otherCookie = await cookieFor("other@example.com");
    const profile = {
      name: "Test Creator",
      handle: "public_creator",
      bio: "About this creator",
      location: "Vilnius",
      niche: "Design",
      rate: 100,
      email: "private-contact@example.com",
      published: false,
      platform: "x",
    };
    expect(
      (await putCreator(request("/api/creator", "PUT", { profile }, cookie)))
        .status,
    ).toBe(200);
    expect(
      (
        await getPublicCreator(
          request("/api/creator/public/public_creator"),
          context("public_creator"),
        )
      ).status,
    ).toBe(404);

    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            { profile: { ...profile, published: true } },
            cookie,
          ),
        )
      ).status,
    ).toBe(200);
    const response = await getPublicCreator(
      request("/api/creator/public/PUBLIC_CREATOR"),
      context("PUBLIC_CREATOR"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.handleVerified).toBe(false);
    expect(body.profile.name).toBe("Test Creator");
    expect(body.profile.email).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("@example.com");
    expect(body.profile.userId).toBeUndefined();
    expect(body.profile.id).toBeUndefined();

    const conflict = await putCreator(
      request(
        "/api/creator",
        "PUT",
        { profile: { ...profile, handle: "PUBLIC_CREATOR", published: true } },
        otherCookie,
      ),
    );
    expect(conflict.status).toBe(409);
    expect(
      (await getCreator(request("/api/creator", "GET", undefined, otherCookie)))
        .status,
    ).toBe(200);
    expect(
      (
        await (
          await getCreator(
            request("/api/creator", "GET", undefined, otherCookie),
          )
        ).json()
      ).profile,
    ).toBeNull();

    expect(
      (await putCreator(request("/api/creator", "PUT", { profile }, cookie)))
        .status,
    ).toBe(200);
    expect(
      (
        await getPublicCreator(
          request("/api/creator/public/public_creator"),
          context("public_creator"),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await deleteCreator(
          request("/api/creator", "DELETE", undefined, cookie),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await (
          await getCreator(request("/api/creator", "GET", undefined, cookie))
        ).json()
      ).profile,
    ).toBeNull();
  });
});
