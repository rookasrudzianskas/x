import { describe, expect, it } from "vitest";
import { sampleReport } from "../../lib/profiles";
import {
  comparisonImageUrl,
  lookupFailureKey,
  parseBoardPayload,
  parseReportPayload,
  updateReportQuery,
} from "./report-utils";

describe("report data boundary", () => {
  const report = sampleReport("demo_milda")!;
  it("recomputes a finite estimate from validated metrics instead of trusting a corrupted estimate", () => {
    expect(
      parseReportPayload({ ...report, estimate: { worth: Infinity } }).estimate,
    ).toEqual(report.estimate);
  });
  it("rejects invalid numbers and missing profile data before rendering", () => {
    expect(() => parseReportPayload({ profile: null })).toThrow();
    expect(() =>
      parseReportPayload({
        ...report,
        profile: {
          ...report.profile,
          metrics: { ...report.profile.metrics, cpm: Infinity },
        },
      }),
    ).toThrow();
  });
  it("rejects unsafe avatar URLs and invalid handles", () => {
    expect(() =>
      parseReportPayload({
        ...report,
        profile: { ...report.profile, avatar: "javascript:alert(1)" },
      }),
    ).toThrow();
    expect(() =>
      parseReportPayload({
        ...report,
        profile: { ...report.profile, handle: "../../other" },
      }),
    ).toThrow();
  });
  it("accepts an empty directory without substituting fabricated activity", () => {
    expect(parseBoardPayload({ profiles: [], total: 0 })).toEqual({
      profiles: [],
      total: 0,
    });
  });
  it("rejects malformed directory metrics", () => {
    expect(() =>
      parseBoardPayload({
        profiles: [{ ...report.profile, metrics: null }],
        total: 1,
      }),
    ).toThrow();
  });
});

describe("report query preservation", () => {
  it("preserves the first report while saving the second, and then preserves the second while saving the first", () => {
    const original = new URL(
      "https://example.test/lt/worth/one/vs/two?report=first&otherReport=second#details",
    );
    const secondSaved = updateReportQuery(original, "second-new", false);
    const firstSaved = updateReportQuery(secondSaved, "first-new");
    expect(firstSaved.searchParams.get("report")).toBe("first-new");
    expect(firstSaved.searchParams.get("otherReport")).toBe("second-new");
    expect(firstSaved.hash).toBe("#details");
    expect(original.searchParams.get("report")).toBe("first");
  });
  it("exports both comparison report IDs and locale without unrelated URL parameters", () => {
    const url = new URL(
      comparisonImageUrl(
        "one",
        "two",
        "lt",
        "?report=id-a&otherReport=id-b&tracking=omit",
      ),
      "https://example.test",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      handle: "one",
      compare: "two",
      lang: "lt",
      format: "download",
      report: "id-a",
      otherReport: "id-b",
    });
  });
  it("omits report IDs for sample-only comparisons", () => {
    expect(comparisonImageUrl("demo_milda", "demo_tomas", "en", "")).toBe(
      "/api/card?handle=demo_milda&compare=demo_tomas&lang=en&format=download",
    );
  });
  it("passes through empty and malformed first IDs rather than substituting later duplicates", () => {
    const url = new URL(
      comparisonImageUrl(
        "demo_milda",
        "demo_tomas",
        "en",
        "?report=&report=550e8400-e29b-41d4-a716-446655440000&otherReport=invalid&otherReport=8f397d6b-7270-4336-898e-5700d5862056",
      ),
      "https://example.test",
    );
    expect(url.searchParams.has("report")).toBe(true);
    expect(url.searchParams.getAll("report")).toEqual([""]);
    expect(url.searchParams.getAll("otherReport")).toEqual(["invalid"]);
  });
});

describe("lookup failures", () => {
  it("distinguishes an unconfigured integration from a temporary provider failure", () => {
    expect(lookupFailureKey(503, "not_configured", false)).toBe(
      "notConfigured",
    );
    expect(lookupFailureKey(503, "x_unavailable", false)).toBe("lookupFailed");
  });
  it("distinguishes missing reports, throttling, and insufficient impressions", () => {
    expect(lookupFailureKey(404, "not_found", true)).toBe("reportMissing");
    expect(lookupFailureKey(429, "rate_limit", true)).toBe("rateLimited");
    expect(lookupFailureKey(422, "insufficient_metrics", false)).toBe(
      "insufficientMetrics",
    );
  });
});
