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
          data: [0, 10, 21, 1_000].map((views, index) => ({
            id: String(100 + index),
            text: `Original post ${index}`,
            public_metrics: { impression_count: views },
          })),
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
            data: [
              {
                id: "1",
                text: "No impressions",
                public_metrics: { like_count: 10 },
              },
            ],
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
      vi
        .fn()
        .mockResolvedValue(
          response({
            errors: [
              { type: "https://api.x.com/2/problems/resource-not-found" },
            ],
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
});
