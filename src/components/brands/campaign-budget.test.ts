import { describe, expect, it } from "vitest";
import { campaignBudget } from "./campaign-budget";

describe("campaign planner budget", () => {
  it("calculates the baseline and preserves cent precision using integer arithmetic", () => {
    expect(campaignBudget(3, 2, "100", "0")).toEqual({
      rate: 100,
      production: 0,
      total: 600,
    });
    expect(campaignBudget(3, 1, "0.10", "0.20")).toEqual({
      rate: 0.1,
      production: 0.2,
      total: 0.5,
    });
    expect(campaignBudget(2, 3, "99,95", "10,01")?.total).toBe(609.71);
  });
  it.each([
    [0, 2, "100", "0"],
    [21, 2, "100", "0"],
    [2.5, 1, "100", "0"],
    [3, 13, "100", "0"],
    [3, 2, "", "0"],
    [3, 2, "10.001", "0"],
    [3, 2, "100", "-10"],
    [3, 2, "Infinity", "0"],
  ] as const)(
    "rejects invalid assumptions instead of exporting a misleading zero: %#",
    (creators, posts, rate, production) => {
      expect(campaignBudget(creators, posts, rate, production)).toBeNull();
    },
  );
  it("supports zero budgets and caps its maximum below the server budget bound", () => {
    expect(campaignBudget(1, 1, "0", "0")?.total).toBe(0);
    expect(campaignBudget(20, 12, "1000000", "1000000")?.total).toBe(
      241_000_000,
    );
  });
});
