import { z } from "zod";

export const DISCOUNT_RATE = 0.1;
export const PROJECTION_YEARS = 5;
export const LOW_CPM_FACTOR = 0.5;
export const HIGH_CPM_FACTOR = 1.5;

export const estimateInputSchema = z.object({
  followers: z.number().int().min(0).max(1_000_000_000),
  medianViews: z.number().min(0).max(1_000_000_000),
  sponsoredPostsPerWeek: z.number().min(0).max(7),
  cpm: z.number().min(0).max(1_000),
});

export type EstimateInput = z.infer<typeof estimateInputSchema>;

export const DEFAULT_ESTIMATE_INPUT: EstimateInput = {
  followers: 1_000,
  medianViews: 500,
  sponsoredPostsPerWeek: 1,
  cpm: 10,
};

/** Accept an X handle or profile URL, rejecting extra URL paths and lookalike hosts. */
export function normalizeHandle(value: string): string | null {
  let candidate = value.trim();

  if (/^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\//i.test(candidate)) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`,
      );
      if (
        !["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
          url.hostname.toLowerCase(),
        )
      ) {
        return null;
      }
      if (url.username || url.password || url.port) return null;
      candidate = url.pathname.replace(/^\//, "").replace(/\/$/, "");
    } catch {
      return null;
    }
  } else {
    candidate = candidate.replace(/^@/, "");
  }

  return /^[A-Za-z0-9_]{1,15}$/.test(candidate) ? candidate : null;
}

/**
 * An illustrative sponsorship scenario in EUR, not a verified market quotation.
 * Followers provide profile context; earnings are based on impressions alone.
 */
export function calculateEstimate(rawInput: EstimateInput) {
  const input = estimateInputSchema.parse(rawInput);
  const perPost = (input.medianViews / 1_000) * input.cpm;
  const annual = perPost * input.sponsoredPostsPerWeek * 52;
  const projection = Array.from({ length: PROJECTION_YEARS }, (_, index) => {
    const year = index + 1;
    return {
      year,
      annual,
      presentValue: annual / (1 + DISCOUNT_RATE) ** year,
    };
  });
  const worth = projection.reduce((sum, year) => sum + year.presentValue, 0);

  return {
    perPost,
    monthly: annual / 12,
    annual,
    worth,
    lowAnnual: annual * LOW_CPM_FACTOR,
    highAnnual: annual * HIGH_CPM_FACTOR,
    lowWorth: worth * LOW_CPM_FACTOR,
    highWorth: worth * HIGH_CPM_FACTOR,
    projection,
  };
}

export type Estimate = ReturnType<typeof calculateEstimate>;
