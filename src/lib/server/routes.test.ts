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
import { POST as postBooking } from "../../app/api/bookings/route";
import { getDatabase } from "./db";
import { verifyAndCreateSession, SESSION_COOKIE } from "./auth";
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
  const { code } = await issueOtp(email);
  await verifyAndCreateSession(
    email,
    code,
    request("/api/auth/session"),
    response,
  );
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

  it("rolls back code consumption when session persistence fails, then allows retry", async () => {
    const email = "retry-session@example.com";
    const { code } = await issueOtp(email);
    const db = await getDatabase();
    await db.execute(`CREATE TRIGGER reject_test_session BEFORE INSERT ON sessions
      WHEN (SELECT email FROM users WHERE id=NEW.user_id)='retry-session@example.com'
      BEGIN SELECT RAISE(ABORT, 'injected session failure'); END`);
    try {
      const failed = await verifyCode(
        request("/api/auth/verify", "POST", { email, code }),
      );
      expect(failed.status).toBe(503);
      expect(failed.headers.get("set-cookie")).toBeNull();
      const row = (
        await db.execute({
          sql: "SELECT used_at,attempts FROM otp_codes WHERE email=?",
          args: [email],
        })
      ).rows[0];
      expect(row.used_at).toBeNull();
      expect(row.attempts).toBe(0);
      expect(
        (
          await db.execute({
            sql: "SELECT id FROM users WHERE email=?",
            args: [email],
          })
        ).rows,
      ).toHaveLength(0);
    } finally {
      await db.execute("DROP TRIGGER reject_test_session");
    }
    expect(
      (await verifyCode(request("/api/auth/verify", "POST", { email, code })))
        .status,
    ).toBe(200);
  });

  it("creates exactly one session when the same OTP is submitted concurrently", async () => {
    const email = "concurrent-login@example.com";
    const { code } = await issueOtp(email);
    const results = await Promise.all([
      verifyCode(request("/api/auth/verify", "POST", { email, code })),
      verifyCode(request("/api/auth/verify", "POST", { email, code })),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    const sessions = await (
      await getDatabase()
    ).execute({
      sql: "SELECT token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE users.email=?",
      args: [email],
    });
    expect(sessions.rows).toHaveLength(1);
  });

  it("keeps the previous OTP usable when a resend fails and never returns a code", async () => {
    const email = "failed-resend@example.com";
    const previous = await issueOtp(email);
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("EMAIL_FROM", "Test <test@example.com>");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "upstream failure" }), {
          status: 500,
        }),
      ),
    );
    try {
      const response = await sendCode(
        request("/api/auth/send-code", "POST", { email, locale: "lt" }),
      );
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        code: "email_failed",
        error: "We could not send the email. Please try again later.",
      });
      expect(
        (
          await verifyCode(
            request("/api/auth/verify", "POST", { email, code: previous.code }),
          )
        ).status,
      ).toBe(200);
    } finally {
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("EMAIL_FROM", "");
      vi.stubGlobal(
        "fetch",
        vi.fn(() => {
          throw new Error("No test may call an external provider.");
        }),
      );
    }
  });

  it("requires a provider receipt and enables only an accepted emailed code", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("EMAIL_FROM", "Test <test@example.com>");
    const provider = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "accepted-test-message" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", provider);
    try {
      const refused = await sendCode(
        request("/api/auth/send-code", "POST", {
          email: "no-receipt@example.com",
          locale: "en",
        }),
      );
      expect(refused.status).toBe(502);
      expect(
        (
          await (
            await getDatabase()
          ).execute(
            "SELECT email FROM otp_codes WHERE email='no-receipt@example.com'",
          )
        ).rows,
      ).toHaveLength(0);
      const accepted = await sendCode(
        request("/api/auth/send-code", "POST", {
          email: "accepted-code@example.com",
          locale: "lt",
        }),
      );
      expect(accepted.status).toBe(200);
      const result = await accepted.json();
      expect(result).toEqual({ ok: true, expiresIn: 600, retryAfter: 60 });
      const message = JSON.parse(provider.mock.calls[1][1].body);
      expect(message.html).toContain('lang="lt"');
      const code = message.text.match(/\n\n(\d{6})\n\n/)[1];
      expect(
        (
          await verifyCode(
            request("/api/auth/verify", "POST", {
              email: "accepted-code@example.com",
              code,
            }),
          )
        ).status,
      ).toBe(200);
    } finally {
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("EMAIL_FROM", "");
      vi.stubGlobal(
        "fetch",
        vi.fn(() => {
          throw new Error("No test may call an external provider.");
        }),
      );
    }
  });
});

describe("public creator privacy", () => {
  it("keeps LinkedIn drafts private and rejects mismatched social links", async () => {
    const cookie = await cookieFor("linkedin-draft@example.com");
    const profile = {
      name: "LinkedIn creator",
      handle: "a-lithuanian-creator",
      platform: "linkedin",
      profileUrl: "https://www.linkedin.com/in/a-lithuanian-creator",
      rate: 50,
      published: false,
    };
    expect(
      (await putCreator(request("/api/creator", "PUT", { profile }, cookie)))
        .status,
    ).toBe(200);
    const own = await (
      await getCreator(request("/api/creator", "GET", undefined, cookie))
    ).json();
    expect(own.profile.handle).toBe(profile.handle);
    expect(own.profile.handleVerified).toBe(false);
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
    ).toBe(400);
    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            {
              profile: {
                ...profile,
                profileUrl: "https://www.linkedin.com/in/somebody-else",
              },
            },
            cookie,
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("resolves concurrent claims with one winner and preserves a rejected publisher's prior page", async () => {
    const first = await cookieFor("claim-one@example.com");
    const second = await cookieFor("claim-two@example.com");
    const payload = {
      profile: {
        name: "First",
        handle: "claim_shared",
        rate: 0,
        published: true,
      },
    };
    const results = await Promise.all([
      putCreator(request("/api/creator", "PUT", payload, first)),
      putCreator(
        request(
          "/api/creator",
          "PUT",
          {
            profile: {
              ...payload.profile,
              name: "Second",
              handle: "CLAIM_SHARED",
            },
          },
          second,
        ),
      ),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const loser = results[0].status === 409 ? first : second;
    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            {
              profile: {
                name: "Prior page",
                handle: "prior_page",
                rate: 0,
                published: true,
              },
            },
            loser,
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (await putCreator(request("/api/creator", "PUT", payload, loser))).status,
    ).toBe(409);
    const prior = await getPublicCreator(
      request("/api/creator/public/prior_page"),
      context("prior_page"),
    );
    expect(prior.status).toBe(200);
    expect((await prior.json()).profile.name).toBe("Prior page");
  });

  it("stores offers, excludes private contact data and rejects inconsistent prices", async () => {
    const cookie = await cookieFor("offers@example.com");
    const offers = [
      {
        id: "post",
        kind: "post",
        title: "Sponsored post",
        price: 90.5,
        unit: "placement",
      },
      {
        id: "custom-1",
        kind: "custom",
        title: "Workshop",
        price: 250,
        unit: "placement",
      },
    ];
    const profile = {
      name: "Offers creator",
      handle: "offer_creator",
      rate: 90.5,
      published: true,
      email: "private@example.com",
      offers,
    };
    expect(
      (await putCreator(request("/api/creator", "PUT", { profile }, cookie)))
        .status,
    ).toBe(200);
    const own = await (
      await getCreator(request("/api/creator", "GET", undefined, cookie))
    ).json();
    expect(own.profile.offers).toEqual(offers);
    const publicData = await (
      await getPublicCreator(
        request("/api/creator/public/offer_creator"),
        context("offer_creator"),
      )
    ).json();
    expect(publicData.profile.offers).toEqual(offers);
    expect(publicData.profile.email).toBeUndefined();
    expect(publicData.profile.handleVerified).toBe(false);
    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            { profile: { ...profile, rate: 91 } },
            cookie,
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            {
              profile: {
                ...profile,
                offers: [...offers, { ...offers[0], id: "other-post" }],
              },
            },
            cookie,
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await putCreator(
          request(
            "/api/creator",
            "PUT",
            {
              profile: {
                ...profile,
                offers: [{ ...offers[0], price: 90.501 }],
                rate: 90.501,
              },
            },
            cookie,
          ),
        )
      ).status,
    ).toBe(400);
  });

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

describe("campaign enquiries", () => {
  it("stores validated private details and returns only a reference, without sending email", async () => {
    const booking = {
      name: "Test Visitor",
      email: "ENQUIRY@EXAMPLE.COM",
      company: "Example studio",
      budget: 600,
      message: "A real campaign planning question.",
      locale: "lt",
    };
    const response = await postBooking(
      request("/api/bookings", "POST", booking),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["id", "ok"]);
    expect(body.ok).toBe(true);
    const row = (
      await (
        await getDatabase()
      ).execute({
        sql: "SELECT request_json FROM booking_requests WHERE id=?",
        args: [body.id],
      })
    ).rows[0];
    expect(JSON.parse(String(row.request_json))).toEqual({
      ...booking,
      email: "enquiry@example.com",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not create a request for invalid input and caps per-email submissions", async () => {
    const booking = {
      name: "Test Visitor",
      email: "booking-cap@example.com",
      company: "Example",
      budget: 100,
      message: "A sufficiently detailed question.",
    };
    const invalid = await postBooking(
      request("/api/bookings", "POST", { ...booking, message: "x" }),
    );
    expect(invalid.status).toBe(400);
    for (let i = 0; i < 3; i++)
      expect(
        (await postBooking(request("/api/bookings", "POST", booking))).status,
      ).toBe(201);
    const limited = await postBooking(
      request("/api/bookings", "POST", booking),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    const rows = (
      await (
        await getDatabase()
      ).execute("SELECT request_json FROM booking_requests")
    ).rows
      .map((row) => JSON.parse(String(row.request_json)))
      .filter((item) => item.email === booking.email);
    expect(rows).toHaveLength(3);
  });
});
