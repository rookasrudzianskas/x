/**
 * Select one complete environment-variable pair without mixing credentials.
 * A selected variable name is returned even when its value is missing so
 * deployment checks can identify the correct configuration to repair.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{
 *   url: string,
 *   authToken: string | undefined,
 *   urlVariable: 'DATABASE_URL' | 'TURSO_DATABASE_URL' | null,
 *   authTokenVariable: 'DATABASE_AUTH_TOKEN' | 'TURSO_AUTH_TOKEN' | null
 * }}
 */
export function resolveDatabaseEnvironment(env) {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return {
      url: databaseUrl,
      authToken: env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      urlVariable: "DATABASE_URL",
      authTokenVariable: "DATABASE_AUTH_TOKEN",
    };
  }

  const tursoUrl = env.TURSO_DATABASE_URL?.trim();
  if (tursoUrl) {
    return {
      url: tursoUrl,
      authToken: env.TURSO_AUTH_TOKEN?.trim() || undefined,
      urlVariable: "TURSO_DATABASE_URL",
      authTokenVariable: "TURSO_AUTH_TOKEN",
    };
  }

  return {
    url: "file:./data/worth.db",
    authToken: undefined,
    urlVariable: null,
    authTokenVariable: null,
  };
}
