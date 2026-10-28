import "server-only";
import { z } from "zod";
import { DEFAULT_ESTIMATE_INPUT, estimateInputSchema } from "../estimate";
import type { CreatorProfile } from "../profiles";
import { ApiError } from "./http";

const userResponseSchema = z.object({
  data: z.object({
    id: z.string().regex(/^\d+$/),
    username: z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
    name: z.string().min(1).max(200),
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
        author_id: z.string().regex(/^\d+$/),
        created_at: z.iso.datetime(),
        referenced_tweets: z
          .array(
            z.object({
              type: z.enum(["retweeted", "replied_to", "quoted"]),
              id: z.string(),
            }),
          )
          .optional(),
        public_metrics: z
          .object({
            impression_count: z.number().int().nonnegative().optional(),
          })
          .optional(),
      }),
    )
    .max(100)
    .optional(),
});
const errorsSchema = z.object({
  errors: z.array(z.object({ type: z.string().optional() })).min(1),
});
const cache = new Map<string, { profile: CreatorProfile; expires: number }>();
const pending = new Map<string, Promise<CreatorProfile>>();

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
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X did not return usable data.",
    );
  }
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
  const existing = pending.get(key);
  if (existing) return existing;
  const lookup = loadXProfile(handle)
    .then((profile) => {
      if (cache.size >= 250) cache.delete(cache.keys().next().value!);
      cache.set(key, { profile, expires: Date.now() + 15 * 60_000 });
      return profile;
    })
    .finally(() => pending.delete(key));
  pending.set(key, lookup);
  return lookup;
}

async function loadXProfile(handle: string): Promise<CreatorProfile> {
  const rawUser = await fetchX(
    `users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics,profile_image_url,description,location`,
  );
  const parsedUser = userResponseSchema.safeParse(rawUser);
  if (!parsedUser.success) {
    if (
      errorsSchema.safeParse(rawUser).success &&
      errorsSchema
        .parse(rawUser)
        .errors.some((error) => error.type?.endsWith("/resource-not-found"))
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
  const now = Date.now();
  const startTime = now - 30 * 24 * 60 * 60_000;
  const start = new Date(startTime).toISOString();
  const rawPosts = await fetchX(
    `users/${user.id}/tweets?max_results=100&exclude=retweets,replies&tweet.fields=public_metrics,created_at,author_id,referenced_tweets&start_time=${encodeURIComponent(start)}`,
  );
  const parsedPosts = postsResponseSchema.safeParse(rawPosts);
  if (!parsedPosts.success)
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X did not return usable post metrics.",
    );
  if (
    !parsedPosts.data.data?.length &&
    errorsSchema.safeParse(rawPosts).success
  )
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X could not return this account's post metrics.",
    );
  const sample = [
    ...new Map(
      (parsedPosts.data.data || [])
        .filter((post) => {
          const created = Date.parse(post.created_at);
          return (
            post.author_id === user.id &&
            created >= startTime &&
            created <= now &&
            !post.referenced_tweets?.some(
              (reference) =>
                reference.type === "retweeted" ||
                reference.type === "replied_to",
            )
          );
        })
        .map((post) => [post.id, post]),
    ).values(),
  ];
  const views = sample
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
    new URL(user.profile_image_url).hostname === "pbs.twimg.com" &&
    new URL(user.profile_image_url).protocol === "https:" &&
    !new URL(user.profile_image_url).username &&
    !new URL(user.profile_image_url).password &&
    !new URL(user.profile_image_url).port
      ? user.profile_image_url
      : undefined;
  const topPost = sample
    .filter((post) => post.public_metrics?.impression_count !== undefined)
    .sort(
      (a, b) =>
        b.public_metrics!.impression_count! -
        a.public_metrics!.impression_count!,
    )[0];
  const metrics = estimateInputSchema.safeParse({
    ...DEFAULT_ESTIMATE_INPUT,
    followers: user.public_metrics.followers_count,
    medianViews,
  });
  if (!metrics.success)
    throw new ApiError(
      502,
      "x_data_unavailable",
      "X returned metrics outside this calculator's supported range.",
    );
  const profile: CreatorProfile = {
    handle: user.username,
    name: user.name,
    bio: user.description || "",
    location: user.location || "",
    color: "#1c2eff",
    avatar,
    metrics: metrics.data,
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
  return profile;
}
