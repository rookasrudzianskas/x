import { describe, expect, it } from "vitest";
import {
  calculateEstimate,
  estimateInputSchema,
  normalizeHandle,
} from "./estimate";

describe("normalizeHandle", () => {
  it.each([
    ["  @vilnius_dev  ", "vilnius_dev"],
    ["Vilnius", "Vilnius"],
    ["https://x.com/vilnius_dev", "vilnius_dev"],
    ["https://www.x.com/vilnius_dev/?s=21", "vilnius_dev"],
    ["twitter.com/Vilnius", "Vilnius"],
    ["https://twitter.com/Vilnius#profile", "Vilnius"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeHandle(input)).toBe(expected);
  });

  it.each([
    "",
    "@",
    "@@vilnius",
    "has spaces",
    "has-hyphens",
    "lietuviškas",
    "a".repeat(16),
    "https://x.com/vilnius/status/123",
    "https://x.com/",
    "https://x.com.evil.test/vilnius",
    "https://evil.test/vilnius",
    "https://x.com:8080/vilnius",
    "javascript:alert(1)",
  ])("rejects invalid input %s", (input) => {
    expect(normalizeHandle(input)).toBeNull();
  });
});

describe("calculateEstimate", () => {
  const scenario = {
    followers: 5_000,
    medianViews: 2_000,
    sponsoredPostsPerWeek: 2,
    cpm: 10,
  };

  it("calculates impression-based earnings and five discounted annual cash flows", () => {
    const estimate = calculateEstimate(scenario);
    expect(estimate.perPost).toBe(20);
    expect(estimate.annual).toBe(2_080);
    expect(estimate.monthly).toBeCloseTo(173.3333333);
    expect(estimate.worth).toBeCloseTo(7_884.83648037, 6);
    expect(estimate.projection).toHaveLength(5);
    expect(estimate.projection[0].presentValue).toBeCloseTo(2_080 / 1.1);
    expect(estimate.projection[4].presentValue).toBeCloseTo(2_080 / 1.1 ** 5);
  });

  it("provides proportional low/high CPM scenarios", () => {
    const estimate = calculateEstimate(scenario);
    expect(estimate.lowAnnual).toBe(1_040);
    expect(estimate.highAnnual).toBe(3_120);
    expect(estimate.lowWorth).toBe(estimate.worth * 0.5);
    expect(estimate.highWorth).toBe(estimate.worth * 1.5);
  });

  it("does not inflate earnings from followers", () => {
    expect(calculateEstimate({ ...scenario, followers: 10_000_000 })).toEqual(
      calculateEstimate(scenario),
    );
  });

  it.each(["medianViews", "cpm", "sponsoredPostsPerWeek"] as const)(
    "returns zero earnings when %s is zero",
    (field) => {
      const estimate = calculateEstimate({ ...scenario, [field]: 0 });
      expect(estimate.annual).toBe(0);
      expect(estimate.worth).toBe(0);
    },
  );

  it("supports a fractional weekly sponsorship frequency", () => {
    expect(
      calculateEstimate({ ...scenario, sponsoredPostsPerWeek: 0.5 }).annual,
    ).toBe(520);
  });

  it("accepts fractional medians from an even number of posts", () => {
    expect(
      calculateEstimate({ ...scenario, medianViews: 1_000.5 }).perPost,
    ).toBeCloseTo(10.005);
  });

  it.each([
    { followers: -1 },
    { followers: 1.5 },
    { medianViews: -1 },
    { sponsoredPostsPerWeek: 7.1 },
    { sponsoredPostsPerWeek: -0.1 },
    { cpm: -10 },
    { cpm: Infinity },
    { cpm: NaN },
    { medianViews: 1_000_000_001 },
  ])("rejects invalid numbers: %o", (invalid) => {
    expect(
      estimateInputSchema.safeParse({ ...scenario, ...invalid }).success,
    ).toBe(false);
    expect(() => calculateEstimate({ ...scenario, ...invalid })).toThrow();
  });
});
