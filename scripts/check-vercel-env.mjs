import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveDatabaseEnvironment } from "../src/lib/database-environment.mjs";

const remoteDatabaseProtocols = new Set(["libsql:", "https:", "wss:"]);

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    host === "[::]" ||
    host === "[::1]" ||
    /^\[::ffff:(?:127\.|7f[0-9a-f]{2}:)/.test(host)
  );
}

function isRemoteDatabaseUrl(value) {
  if (!isNonEmpty(value) || value !== value.trim() || value.includes("\\"))
    return false;
  try {
    const url = new URL(value);
    if (
      !remoteDatabaseProtocols.has(url.protocol) ||
      !url.hostname ||
      isLocalHostname(url.hostname) ||
      url.username ||
      url.password ||
      url.hash
    )
      return false;
    // Production credentials stay in the matching token variable and use TLS.
    for (const [key, parameter] of url.searchParams) {
      if (key !== "tls" || parameter !== "1") return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isHttpsOrigin(value) {
  if (!isNonEmpty(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !isLocalHostname(url.hostname) &&
      value === url.origin
    );
  } catch {
    return false;
  }
}

/** Pure validation: return variable names only, never their values. */
export function validateVercelEnv(env) {
  const invalid = [];
  const database = resolveDatabaseEnvironment(env);
  if (!isRemoteDatabaseUrl(database.url))
    invalid.push(database.urlVariable || "DATABASE_URL");
  if (!isNonEmpty(database.authToken))
    invalid.push(database.authTokenVariable || "DATABASE_AUTH_TOKEN");
  if (!isHttpsOrigin(env.NEXT_PUBLIC_APP_URL))
    invalid.push("NEXT_PUBLIC_APP_URL");
  if (env.TRUST_PROXY !== "1") invalid.push("TRUST_PROXY");

  // Email can be entirely disabled. A partial configuration cannot send codes.
  if (env.RESEND_API_KEY || env.EMAIL_FROM) {
    if (!isNonEmpty(env.RESEND_API_KEY)) invalid.push("RESEND_API_KEY");
    if (!isNonEmpty(env.EMAIL_FROM)) invalid.push("EMAIL_FROM");
    if (
      typeof env.AUTH_SECRET !== "string" ||
      env.AUTH_SECRET.trim().length < 32
    )
      invalid.push("AUTH_SECRET");
  }
  return invalid;
}

// Do not load local .env files: Vercel must provide its deployment environment.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const invalid = validateVercelEnv(process.env);
  if (invalid.length) {
    process.stderr.write(
      `Vercel environment check failed:\n${invalid.join("\n")}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Vercel environment check passed.\n");
  }
}
