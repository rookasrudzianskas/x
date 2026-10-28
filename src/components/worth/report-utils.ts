import { z } from "zod";
import { calculateEstimate, estimateInputSchema } from "../../lib/estimate";
import type { Locale } from "../../lib/i18n";
import type { Report } from "../../lib/profiles";
import { firstQueryValue } from "../../lib/report-query";

const profileSchema = z.object({
  handle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
  name: z.string().trim().min(1).max(200),
  bio: z.string().max(500),
  location: z.string().max(100),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  avatar: z
    .url()
    .refine((value) => new URL(value).protocol === "https:")
    .optional(),
  metrics: estimateInputSchema,
  source: z.enum(["sample", "manual", "x"]),
  updatedAt: z.string(),
  sampleSize: z.number().int().min(0).max(100).optional(),
  reportId: z.string().min(1).max(120).optional(),
  topPost: z
    .object({
      id: z.string().regex(/^\d+$/),
      text: z.string().max(25_000),
      views: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    })
    .optional(),
});

/** Validate API boundaries before values reach charts, calculations or links. */
export function parseReportPayload(value: unknown): Report {
  const parsed = z
    .object({
      id: z.string().min(1).max(120).optional(),
      profile: profileSchema,
    })
    .parse(value);
  return {
    id: parsed.id || `${parsed.profile.source}-${parsed.profile.handle}`,
    profile: parsed.profile,
    estimate: calculateEstimate(parsed.profile.metrics),
  };
}

export function parseBoardPayload(value: unknown) {
  return z
    .object({
      profiles: z.array(profileSchema).max(100),
      total: z.number().int().min(0),
    })
    .parse(value);
}

export type LookupError =
  | "notConfigured"
  | "notFound"
  | "rateLimited"
  | "lookupFailed"
  | "reportMissing"
  | "insufficientMetrics";

export function lookupFailureKey(
  status: number,
  code: string,
  savedReport: boolean,
): LookupError {
  if (status === 429) return "rateLimited";
  if (savedReport && (status === 400 || status === 404)) return "reportMissing";
  if (code === "not_configured") return "notConfigured";
  if (code === "insufficient_metrics") return "insufficientMetrics";
  if (status === 404) return "notFound";
  return "lookupFailed";
}

/** Always start from the current URL so editing one side retains the other. */
export function updateReportQuery(current: URL, id: string, primary = true) {
  const next = new URL(current);
  next.searchParams.set(primary ? "report" : "otherReport", id);
  return next;
}

export function comparisonImageUrl(
  handle: string,
  opponent: string,
  locale: Locale,
  search: string,
) {
  const current = new URLSearchParams(search);
  const params = new URLSearchParams({
    handle,
    compare: opponent,
    lang: locale,
    format: "download",
  });
  for (const key of ["report", "otherReport"] as const) {
    const id = firstQueryValue(current, key);
    if (id !== undefined) params.set(key, id);
  }
  return `/api/card?${params.toString()}`;
}
