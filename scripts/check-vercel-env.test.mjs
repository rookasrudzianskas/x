import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateVercelEnv } from "./check-vercel-env.mjs";

const valid = {
  DATABASE_URL: "libsql://worth-example.turso.io",
  DATABASE_AUTH_TOKEN: "test-token-not-a-real-credential",
  NEXT_PUBLIC_APP_URL: "https://worth.example.test",
  TRUST_PROXY: "1",
};

describe("Vercel environment preflight", () => {
  it("allows deployment with email and X entirely disabled", () => {
    expect(validateVercelEnv(valid)).toEqual([]);
    expect(
      validateVercelEnv({
        ...valid,
        RESEND_API_KEY: "",
        EMAIL_FROM: "",
        AUTH_SECRET: "",
      }),
    ).toEqual([]);
  });

  it("reports all missing required names without values", () => {
    expect(validateVercelEnv({})).toEqual([
      "DATABASE_URL",
      "DATABASE_AUTH_TOKEN",
      "NEXT_PUBLIC_APP_URL",
      "TRUST_PROXY",
    ]);
  });

  it.each([
    "file:./data/worth.db",
    "file:/tmp/worth.db",
    ":memory:",
    "file::memory:",
    "file::memory:?cache=shared",
    "sqlite://worth.db",
    "not-a-url",
    "postgres://database.example.test/worth",
    "libsql:///no-host",
    "libsql://localhost:8080",
    "http://127.0.0.1:8080",
    "http://127.1:8080",
    "libsql://test.localhost:8080",
    "https://[::1]:8080",
    "https://[::ffff:127.0.0.1]:8080",
    "https://0.0.0.0:8080",
    "libsql://worth-example.turso.io#fragment",
    "libsql://user:password@worth-example.turso.io",
    "libsql://worth-example.turso.io?mode=memory",
    "libsql://worth-example.turso.io?tls=invalid",
    "libsql://worth-example.turso.io?tls=0",
    "http://database.example.test:8080",
    "ws://database.example.test:8080",
    "libsql://database.example.test:8080?tls=0",
    "libsql://worth-example.turso.io?authToken=must-not-be-in-the-url",
  ])("rejects unusable database URL %j", (url) => {
    expect(validateVercelEnv({ ...valid, DATABASE_URL: url })).toEqual([
      "DATABASE_URL",
    ]);
  });

  it.each([
    "libsql://worth-example.turso.io",
    "https://database.example.test",
    "wss://database.example.test",
    " libsql://worth-example.turso.io ",
    "libsql://worth-example.turso.io?tls=1",
  ])("accepts a supported remote database URL %s", (url) => {
    expect(validateVercelEnv({ ...valid, DATABASE_URL: url })).toEqual([]);
  });

  it.each([undefined, "", "   "])(
    "requires a separate remote database token",
    (token) => {
      expect(
        validateVercelEnv({ ...valid, DATABASE_AUTH_TOKEN: token }),
      ).toEqual(["DATABASE_AUTH_TOKEN"]);
    },
  );

  it("accepts the native Vercel Turso pair without DATABASE variables", () => {
    expect(
      validateVercelEnv({
        TURSO_DATABASE_URL: "libsql://integration-example.turso.io",
        TURSO_AUTH_TOKEN: "integration-test-token",
        NEXT_PUBLIC_APP_URL: valid.NEXT_PUBLIC_APP_URL,
        TRUST_PROXY: "1",
      }),
    ).toEqual([]);
  });

  it("prefers an explicit DATABASE pair and does not hide a bad explicit URL", () => {
    const env = {
      ...valid,
      TURSO_DATABASE_URL: "file:wrong-integration.db",
      TURSO_AUTH_TOKEN: "",
    };
    expect(validateVercelEnv(env)).toEqual([]);
    expect(
      validateVercelEnv({
        ...env,
        DATABASE_URL: "file:explicit-local.db",
        TURSO_DATABASE_URL: "libsql://integration-example.turso.io",
        TURSO_AUTH_TOKEN: "integration-test-token",
      }),
    ).toEqual(["DATABASE_URL"]);
  });

  it("never borrows the integration token for an explicit DATABASE URL", () => {
    expect(
      validateVercelEnv({
        ...valid,
        DATABASE_AUTH_TOKEN: undefined,
        TURSO_DATABASE_URL: "libsql://integration-example.turso.io",
        TURSO_AUTH_TOKEN: "integration-test-token",
      }),
    ).toEqual(["DATABASE_AUTH_TOKEN"]);
  });

  it("never borrows the explicit token for an integration URL", () => {
    expect(
      validateVercelEnv({
        ...valid,
        DATABASE_URL: undefined,
        TURSO_DATABASE_URL: "libsql://integration-example.turso.io",
      }),
    ).toEqual(["TURSO_AUTH_TOKEN"]);
  });

  it("uses integration diagnostics and rejects insecure integration URLs", () => {
    expect(
      validateVercelEnv({
        ...valid,
        DATABASE_URL: undefined,
        TURSO_DATABASE_URL: "http://integration-example.turso.io",
        TURSO_AUTH_TOKEN: "integration-test-token",
      }),
    ).toEqual(["TURSO_DATABASE_URL"]);
  });

  it("treats blank DATABASE URLs as unset and follows the shared trimming rules", () => {
    expect(
      validateVercelEnv({
        ...valid,
        DATABASE_URL: "  ",
        TURSO_DATABASE_URL: " libsql://integration-example.turso.io ",
        TURSO_AUTH_TOKEN: " integration-test-token ",
      }),
    ).toEqual([]);
    expect(validateVercelEnv({ ...valid, DATABASE_URL: "" })).toEqual([
      "DATABASE_URL",
      "DATABASE_AUTH_TOKEN",
    ]);
  });

  it.each([
    undefined,
    "",
    "worth.example.test",
    "http://worth.example.test",
    "https://worth.example.test/",
    "https://worth.example.test/path",
    "https://worth.example.test?token=hidden",
    "https://worth.example.test#part",
    "https://user:secret@worth.example.test",
    " https://worth.example.test",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://worth.example.test:443",
  ])("rejects a non-clean public HTTPS origin %j", (origin) => {
    expect(
      validateVercelEnv({ ...valid, NEXT_PUBLIC_APP_URL: origin }),
    ).toEqual(["NEXT_PUBLIC_APP_URL"]);
  });

  it.each([undefined, "", "0", "true", " 1"])(
    "requires exact trusted-proxy opt-in",
    (proxy) => {
      expect(validateVercelEnv({ ...valid, TRUST_PROXY: proxy })).toEqual([
        "TRUST_PROXY",
      ]);
    },
  );

  it("allows complete email settings and a sufficiently long secret", () => {
    expect(
      validateVercelEnv({
        ...valid,
        RESEND_API_KEY: "test-email-key",
        EMAIL_FROM: "Worth <hello@example.test>",
        AUTH_SECRET: "a".repeat(32),
      }),
    ).toEqual([]);
  });

  it("rejects partial email setup", () => {
    expect(
      validateVercelEnv({ ...valid, RESEND_API_KEY: "test-email-key" }),
    ).toEqual(["EMAIL_FROM", "AUTH_SECRET"]);
    expect(
      validateVercelEnv({
        ...valid,
        EMAIL_FROM: "hello@example.test",
        AUTH_SECRET: "a".repeat(32),
      }),
    ).toEqual(["RESEND_API_KEY"]);
    expect(
      validateVercelEnv({
        ...valid,
        RESEND_API_KEY: "   ",
        EMAIL_FROM: "hello@example.test",
        AUTH_SECRET: "a".repeat(32),
      }),
    ).toEqual(["RESEND_API_KEY"]);
  });

  it.each([undefined, "", "a".repeat(31), " ".repeat(32)])(
    "rejects a missing or short email-auth secret",
    (secret) => {
      expect(
        validateVercelEnv({
          ...valid,
          RESEND_API_KEY: "test-email-key",
          EMAIL_FROM: "hello@example.test",
          AUTH_SECRET: secret,
        }),
      ).toEqual(["AUTH_SECRET"]);
    },
  );

  it("does not mutate the supplied environment", () => {
    const env = Object.freeze({ ...valid });
    expect(validateVercelEnv(env)).toEqual([]);
    expect(env).toEqual(valid);
  });
});

describe("Vercel build wiring and CLI", () => {
  const script = fileURLToPath(
    new URL("./check-vercel-env.mjs", import.meta.url),
  );
  it("fails before building and prints variable names, never supplied values", () => {
    const result = spawnSync(process.execPath, [script], {
      env: {
        DATABASE_URL: "file:DO_NOT_PRINT_DATABASE",
        DATABASE_AUTH_TOKEN: "DO_NOT_PRINT_TOKEN",
        NEXT_PUBLIC_APP_URL: "http://DO_NOT_PRINT_ORIGIN.test",
        TRUST_PROXY: "DO_NOT_PRINT_PROXY",
        RESEND_API_KEY: "DO_NOT_PRINT_EMAIL_KEY",
        AUTH_SECRET: "DO_NOT_PRINT_SECRET",
      },
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Vercel environment check failed:\nDATABASE_URL\nNEXT_PUBLIC_APP_URL\nTRUST_PROXY\nEMAIL_FROM\nAUTH_SECRET\n",
    );
    expect(result.stderr).not.toContain("DO_NOT_PRINT");
  });

  it("exits successfully with a valid environment without printing credentials", () => {
    const result = spawnSync(process.execPath, [script], {
      env: valid,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe("Vercel environment check passed.\n");
  });

  it("runs validation only for the explicit Vercel build", () => {
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
    );
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(config.framework).toBe("nextjs");
    expect(config.buildCommand).toBe("npm run build:vercel");
    expect(pkg.scripts.build).toBe("next build");
    expect(pkg.scripts["check:vercel-env"]).toBe(
      "node scripts/check-vercel-env.mjs",
    );
    expect(pkg.scripts["build:vercel"]).toBe(
      "npm run check:vercel-env && next build",
    );
  });
});
