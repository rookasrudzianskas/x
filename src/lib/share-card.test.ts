import { describe, expect, it } from "vitest";
import {
  cardPathQuery,
  parseCardQuery,
  shortenCardText,
  supportedCardName,
} from "./share-card";

describe("share-card identity", () => {
  const id = "6984c853-1944-46e0-913f-d9e44a55b694";
  it("normalizes both handles and preserves saved report IDs", () => {
    const query = parseCardQuery(
      new URLSearchParams({
        handle: "@Alpha",
        compare: "https://x.com/Beta",
        report: id,
        otherReport: id,
        lang: "lt",
        format: "download",
      }),
    );
    expect(query).toMatchObject({
      handle: "Alpha",
      compare: "Beta",
      report: id,
      otherReport: id,
      lang: "lt",
    });
  });
  it.each([
    { handle: "bad handle" },
    { report: id },
    { handle: "alpha", report: "invalid" },
    { handle: "alpha", otherReport: id },
    { handle: "alpha", compare: "ALPHA" },
    { handle: "alpha", compare: "beta", otherReport: "invalid" },
    { lang: "de" },
  ])("rejects inconsistent image identity %j", (input) => {
    expect(() =>
      parseCardQuery(
        new URLSearchParams(
          Object.entries(input).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      ),
    ).toThrow();
  });
  it("maps original-style paths without dropping either report", () => {
    const query = cardPathQuery(
      `https://example.com/en/worth/alpha/vs/beta/card.png?report=${id}&otherReport=${id}&download=1`,
      { locale: "en", handle: "alpha", opponent: "beta" },
      true,
    );
    expect(parseCardQuery(query)).toMatchObject({
      handle: "alpha",
      compare: "beta",
      report: id,
      otherReport: id,
      format: "download",
    });
  });
  it("shortens names without splitting a composed emoji", () => {
    expect(shortenCardText("👩‍💻👩‍💻👩‍💻👩‍💻", 3)).toBe("👩‍💻👩‍💻…");
    expect(shortenCardText("Živilė", 8)).toBe("Živilė");
  });
  it("uses the first duplicate consistently and does not discard invalid IDs", () => {
    expect(
      parseCardQuery(
        new URLSearchParams(`handle=alpha&report=${id}&report=bad`),
      ).report,
    ).toBe(id);
    expect(() =>
      parseCardQuery(
        new URLSearchParams(`handle=alpha&report=bad&report=${id}`),
      ),
    ).toThrow();
    expect(() =>
      parseCardQuery(new URLSearchParams(`handle=alpha&report=&report=${id}`)),
    ).toThrow();
    const mapped = cardPathQuery(
      "https://example.com/?report=&report=other",
      { locale: "en", handle: "alpha" },
      false,
    );
    expect(mapped.has("report")).toBe(true);
    expect(mapped.get("report")).toBe("");
  });
  it("keeps names renderable with local fonts and falls back to the handle", () => {
    expect(supportedCardName("Živilė 👩‍💻", "zivile")).toBe("Živilė");
    expect(supportedCardName("👩‍💻你好", "zivile")).toBe("@zivile");
    expect(supportedCardName("A\u0304žuolas", "azuolas")).toBe("Āžuolas");
  });
});
