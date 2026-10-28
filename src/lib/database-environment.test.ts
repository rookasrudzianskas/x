import { describe, expect, it } from "vitest";
import { resolveDatabaseEnvironment } from "./database-environment.mjs";

describe("database environment selection", () => {
  it("prefers the explicit pair over Marketplace variables and trims its values", () => {
    expect(
      resolveDatabaseEnvironment({
        DATABASE_URL: "  libsql://primary.example  ",
        DATABASE_AUTH_TOKEN: "  primary-token\n",
        TURSO_DATABASE_URL: "libsql://marketplace.example",
        TURSO_AUTH_TOKEN: "marketplace-token",
      }),
    ).toEqual({
      url: "libsql://primary.example",
      authToken: "primary-token",
      urlVariable: "DATABASE_URL",
      authTokenVariable: "DATABASE_AUTH_TOKEN",
    });
  });

  it.each([undefined, "", " \n "])(
    "does not borrow a Marketplace token when the explicit token is %j",
    (token) => {
      expect(
        resolveDatabaseEnvironment({
          DATABASE_URL: "libsql://primary.example",
          DATABASE_AUTH_TOKEN: token,
          TURSO_DATABASE_URL: "libsql://marketplace.example",
          TURSO_AUTH_TOKEN: "marketplace-token",
        }),
      ).toEqual({
        url: "libsql://primary.example",
        authToken: undefined,
        urlVariable: "DATABASE_URL",
        authTokenVariable: "DATABASE_AUTH_TOKEN",
      });
    },
  );

  it.each([undefined, "", " \n "])(
    "uses the Marketplace pair when the explicit URL is %j",
    (url) => {
      expect(
        resolveDatabaseEnvironment({
          DATABASE_URL: url,
          DATABASE_AUTH_TOKEN: "unrelated-primary-token",
          TURSO_DATABASE_URL: " \nlibsql://marketplace.example ",
          TURSO_AUTH_TOKEN: " marketplace-token ",
        }),
      ).toEqual({
        url: "libsql://marketplace.example",
        authToken: "marketplace-token",
        urlVariable: "TURSO_DATABASE_URL",
        authTokenVariable: "TURSO_AUTH_TOKEN",
      });
    },
  );

  it("does not borrow an explicit token for a Marketplace URL", () => {
    expect(
      resolveDatabaseEnvironment({
        DATABASE_AUTH_TOKEN: "unrelated-primary-token",
        TURSO_DATABASE_URL: "libsql://marketplace.example",
        TURSO_AUTH_TOKEN: " ",
      }),
    ).toEqual({
      url: "libsql://marketplace.example",
      authToken: undefined,
      urlVariable: "TURSO_DATABASE_URL",
      authTokenVariable: "TURSO_AUTH_TOKEN",
    });
  });

  it.each([
    {},
    {
      DATABASE_URL: " ",
      DATABASE_AUTH_TOKEN: "unused-primary-token",
      TURSO_DATABASE_URL: "\n",
      TURSO_AUTH_TOKEN: "unused-marketplace-token",
    },
  ])("distinguishes the local default from a supplied URL: %j", (env) => {
    expect(resolveDatabaseEnvironment(env)).toEqual({
      url: "file:./data/worth.db",
      authToken: undefined,
      urlVariable: null,
      authTokenVariable: null,
    });
  });

  it("preserves a nonempty invalid explicit URL for validation instead of silently switching databases", () => {
    const env = Object.freeze({
      DATABASE_URL: "not-a-valid-url",
      DATABASE_AUTH_TOKEN: "primary-token",
      TURSO_DATABASE_URL: "libsql://marketplace.example",
      TURSO_AUTH_TOKEN: "marketplace-token",
    });
    expect(resolveDatabaseEnvironment(env)).toMatchObject({
      url: "not-a-valid-url",
      authToken: "primary-token",
      urlVariable: "DATABASE_URL",
    });
  });
});
