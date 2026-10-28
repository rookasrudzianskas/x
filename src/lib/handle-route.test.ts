import { describe, expect, it } from "vitest";
import { normalizeHandleSegment } from "./handle-route";

describe("handle path segments", () => {
  it.each(["demo_milda", "@demo_milda", "%40demo_milda"])(
    "normalizes %s",
    (value) => {
      expect(normalizeHandleSegment(value)).toBe("demo_milda");
    },
  );
  it.each(["%", "%2540demo_milda", "bad%20handle", "abc%2Fdef"])(
    "rejects %s",
    (value) => {
      expect(normalizeHandleSegment(value)).toBeNull();
    },
  );
});
