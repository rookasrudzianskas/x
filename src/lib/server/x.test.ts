import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { lookupXProfile } from "./x";

beforeEach(() => vi.stubEnv("X_API_BEARER_TOKEN", "test-only-token"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const user = {
  id: "12345",
  name: "Test Creator",
  username: "test_creator",
  location: "Vilnius",
  description: "Test profile",
  profile_image_url: "https://pbs.twimg.com/profile_images/test.jpg",
  public_metrics: { followers_count: 1_000 },
};
function post(
  id: string,
  views: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    text: `Original post ${id}`,
    author_id: user.id,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    public_metrics: { impression_count: views },
    ...overrides,
  };
}

describe("X provider", () => {
  it("reports unconfigured live lookup without fabricating a profile", async () => {
    vi.stubEnv("X_API_BEARER_TOKEN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(lookupXProfile("missing_config")).rejects.toMatchObject({
      status: 503,
      code: "not_configured",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calculates the median from public impressions and exposes the genuine top post", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ data: user }))
      .mockResolvedValueOnce(
        response({
          data: [0, 10, 21, 1_000].map((views, index) =>
            post(String(100 + index), views, {
              text: `Original post ${index}`,
            }),
          ),
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const profile = await lookupXProfile("provider_test");
    expect(profile.source).toBe("x");
    expect(profile.metrics.medianViews).toBe(15.5);
    expect(profile.metrics.followers).toBe(1_000);
    expect(profile.sampleSize).toBe(4);
    expect(profile.topPost).toEqual({
      id: "103",
      text: "Original post 3",
      views: 1_000,
    });
    expect(String(fetch.mock.calls[1][0])).toContain(
      "exclude=retweets,replies",
    );
    expect(String(fetch.mock.calls[1][0])).toContain("start_time=");
    expect(await lookupXProfile("PROVIDER_TEST")).toEqual(profile);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not treat absent impression metrics as zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ data: user }))
        .mockResolvedValueOnce(
          response({
            data: [post("1", 0, { public_metrics: { like_count: 10 } })],
          }),
        ),
    );
    await expect(lookupXProfile("no_metrics")).rejects.toMatchObject({
      status: 422,
      code: "insufficient_metrics",
    });
  });

  it("maps unknown profiles and provider failures without exposing provider payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          errors: [{ type: "https://api.x.com/2/problems/resource-not-found" }],
        }),
      ),
    );
    await expect(lookupXProfile("unknown_test")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ secret: "should never be exposed" }, 401),
        ),
    );
    await expect(lookupXProfile("denied_test")).rejects.toMatchObject({
      status: 503,
      code: "x_unavailable",
    });
  });

  it("filters dates, authors, replies and reposts and counts unique original posts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ data: user }))
        .mockResolvedValueOnce(
          response({
            data: [
              post("1", 5),
              post("2", 10),
              post("3", 15),
              post("3", 15),
              post("4", 20, {
                referenced_tweets: [{ type: "quoted", id: "99" }],
              }),
              post("5", 999, { author_id: "999" }),
              post("6", 999, {
                created_at: new Date(
                  Date.now() - 31 * 24 * 60 * 60_000,
                ).toISOString(),
              }),
              post("7", 999, {
                created_at: new Date(Date.now() + 60_000).toISOString(),
              }),
              post("8", 999, {
                referenced_tweets: [{ type: "retweeted", id: "99" }],
              }),
              post("9", 999, {
                referenced_tweets: [{ type: "replied_to", id: "99" }],
              }),
            ],
          }),
        ),
    );
    const profile = await lookupXProfile("sample_filter");
    expect(profile.sampleSize).toBe(4);
    expect(profile.metrics.medianViews).toBe(12.5);
    expect(profile.topPost?.id).toBe("4");
  });

  it("coalesces concurrent lookups and allows a retry after an upstream failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({ data: user }))
      .mockResolvedValueOnce(
        response({ data: [post("1", 10), post("2", 20), post("3", 30)] }),
      );
    vi.stubGlobal("fetch", fetch);
    const failed = await Promise.allSettled([
      lookupXProfile("retry_provider"),
      lookupXProfile("RETRY_PROVIDER"),
    ]);
    expect(failed.every((result) => result.status === "rejected")).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [first, second] = await Promise.all([
      lookupXProfile("retry_provider"),
      lookupXProfile("RETRY_PROVIDER"),
    ]);
    expect(first).toEqual(second);
    expect(first.metrics.medianViews).toBe(20);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("distinguishes provider errors from an account with too few posts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ data: user }))
        .mockResolvedValueOnce(
          response({
            errors: [
              {
                type: "https://api.x.com/2/problems/not-authorized-for-resource",
              },
            ],
          }),
        ),
    );
    await expect(lookupXProfile("post_errors")).rejects.toMatchObject({
      status: 502,
      code: "x_data_unavailable",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not JSON", { status: 200 })),
    );
    await expect(lookupXProfile("bad_json")).rejects.toMatchObject({
      status: 502,
      code: "x_data_unavailable",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ errors: [null, { type: 3 }] })),
    );
    await expect(lookupXProfile("bad_errors")).rejects.toMatchObject({
      status: 502,
      code: "x_data_unavailable",
    });
  });
});
