import { describe, expect, it } from "vitest";
import {
  firstQueryValue,
  isValidReportId,
  reportIdSchema,
} from "./report-query";

const firstId = "8f397d6b-7270-4336-898e-5700d5862056";
const secondId = "550e8400-e29b-41d4-a716-446655440000";

describe("firstQueryValue", () => {
  it("uses the first duplicate in URLSearchParams and Next page parameters", () => {
    expect(
      firstQueryValue(
        new URLSearchParams(`report=${firstId}&report=${secondId}`),
        "report",
      ),
    ).toBe(firstId);
    expect(firstQueryValue({ report: [firstId, secondId] }, "report")).toBe(
      firstId,
    );
  });

  it("preserves a supplied empty first value instead of falling back to a later valid ID", () => {
    expect(
      firstQueryValue(
        new URLSearchParams(`report=&report=${secondId}`),
        "report",
      ),
    ).toBe("");
    expect(firstQueryValue({ report: ["", secondId] }, "report")).toBe("");
    expect(firstQueryValue({ report: "" }, "report")).toBe("");
  });

  it("preserves malformed values so every consumer can reject them consistently", () => {
    expect(
      firstQueryValue(
        new URLSearchParams(`report=invalid&report=${secondId}`),
        "report",
      ),
    ).toBe("invalid");
    expect(
      firstQueryValue({ otherReport: ["not-a-uuid", secondId] }, "otherReport"),
    ).toBe("not-a-uuid");
  });

  it("distinguishes absent values from supplied empty strings", () => {
    expect(firstQueryValue(new URLSearchParams(), "report")).toBeUndefined();
    expect(firstQueryValue({}, "report")).toBeUndefined();
    expect(firstQueryValue({ report: undefined }, "report")).toBeUndefined();
    expect(firstQueryValue({ report: [] }, "report")).toBeUndefined();
  });
});

describe("report ID validation", () => {
  it("accepts UUID report IDs without changing their case or value", () => {
    expect(isValidReportId(firstId)).toBe(true);
    expect(reportIdSchema.parse(firstId.toUpperCase())).toBe(
      firstId.toUpperCase(),
    );
  });

  it.each([
    "",
    "invalid",
    "sample-demo_milda",
    "123",
    ` ${firstId}`,
    `${firstId} `,
    firstId.replaceAll("-", ""),
    "550e8400-e29b-41d4-0716-446655440000",
  ])("rejects invalid supplied ID %j", (value) => {
    expect(isValidReportId(value)).toBe(false);
  });
});
