import "server-only";
import { z } from "zod";
import { DEFAULT_ESTIMATE_INPUT } from "../estimate";
import type { CreatorProfile } from "../profiles";
import { ApiError } from "./http";

const userResponseSchema = z.object({
  data: z.object({
    id: z.string().regex(/^\d+$/),
    username: z.string(),
    name: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    profile_image_url: z.string().url().optional(),
    public_metrics: z.object({
      followers_count: z.number().int().nonnegative(),
    }),
  }),
});
const postsResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().regex(/^\d+$/),
        text: z.string(),
        public_metrics: z
          .object({
            impression_count: z.number().int().nonnegative().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});
const cache = new Map<string, { profile: CreatorProfile; expires: number }>();

async function fetchX(path: string) {
  let response: Response;
  try {
    response = await fetch(`https://api.x.com/2/${path}`, {
      headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      502,
      "x_unavailable",
      "X could not be reached. Please enter your metrics manually.",
    );
  }
  if (response.status === 404)
    throw new ApiError(404, "not_found", "That X profile could not be found.");
  if (response.status === 429)
    throw new ApiError(
      429,
      "x_rate_limited",
      "X is temporarily rate limited. Please try again later.",
      60,
    );
  if (!response.ok)
    throw new ApiError(
      503,
      "x_unavailable",
      "Live X lookup is unavailable. Please enter your metrics manually.",
    );
  return response.json();
}

export async function lookupXProfile(handle: string): Promise<CreatorProfile> {
  if (!process.env.X_API_BEARER_TOKEN)
    throw new ApiError(
      503,
      "not_configured",
      "Live X lookup is not configured. Enter your metrics to calculate an estimate.",
    );
  const key = handle.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.profile;

  const rawUser = await fetchX(
    `users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics,profile_image_url,description,location`,
  );
  const parsedUser = userResponseSchema.safeParse(rawUser);
  if (!parsedUser.success) {
    if (
      typeof rawUser === "object" &&
      rawUser !== null &&
      !rawUser.data &&
      Array.isArray(rawUser.errors) &&
      rawUser.errors.some((error: { type?: string }) =>
        error.type?.endsWith("/resource-not-found"),
      )
    )
      throw new ApiError(
        404,
        "not_found",
        "That X profile could not be found.",
      );
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X did not return usable profile metrics.",
    );
  }
  const user = parsedUser.data.data;
  // One page: the most recent up to 100 original posts in the last 30 days.
  // The median and topPost describe only this sample, not the account's lifetime.
  const start = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const rawPosts = await fetchX(
    `users/${user.id}/tweets?max_results=100&exclude=retweets,replies&tweet.fields=public_metrics&start_time=${encodeURIComponent(start)}`,
  );
  const parsedPosts = postsResponseSchema.safeParse(rawPosts);
  if (!parsedPosts.success)
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X did not return usable post metrics.",
    );
  const views = (parsedPosts.data.data || [])
    .flatMap((post) =>
      post.public_metrics?.impression_count === undefined
        ? []
        : [post.public_metrics.impression_count],
    )
    .sort((a, b) => a - b);
  if (views.length < 3)
    throw new ApiError(
      422,
      "insufficient_metrics",
      "At least three original posts with impressions from the last 30 days are needed. Enter your metrics manually.",
    );
  const middle = Math.floor(views.length / 2);
  const medianViews =
    views.length % 2 ? views[middle] : (views[middle - 1] + views[middle]) / 2;
  const avatar =
    user.profile_image_url &&
    new URL(user.profile_image_url).hostname === "pbs.twimg.com"
      ? user.profile_image_url
      : undefined;
  const topPost = parsedPosts.data.data
    ?.filter((post) => post.public_metrics?.impression_count !== undefined)
    .sort(
      (a, b) =>
        b.public_metrics!.impression_count! -
        a.public_metrics!.impression_count!,
    )[0];
  const profile: CreatorProfile = {
    handle: user.username,
    name: user.name,
    bio: user.description || "",
    location: user.location || "",
    color: "#1c2eff",
    avatar,
    metrics: {
      ...DEFAULT_ESTIMATE_INPUT,
      followers: user.public_metrics.followers_count,
      medianViews,
    },
    source: "x",
    updatedAt: new Date().toISOString(),
    sampleSize: views.length,
    topPost: topPost
      ? {
          id: topPost.id,
          text: topPost.text,
          views: topPost.public_metrics!.impression_count!,
        }
      : undefined,
  };
  if (cache.size >= 250) cache.delete(cache.keys().next().value!);
  cache.set(key, { profile, expires: Date.now() + 15 * 60_000 });
  return profile;
}
