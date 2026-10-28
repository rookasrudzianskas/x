import { describe, expect, it } from "vitest";
import { builtinOffer } from "@/lib/creator-offers";
import {
  creatorLocaleHref,
  emptyProfile,
  externalProfileUrl,
  normalizeCreatorInput,
  parseCreatorDraft,
  parseCreatorProfile,
  profileExport,
  type CreatorProfile,
} from "./profile-data";

const profile: CreatorProfile = {
  ...emptyProfile("vilnius_maker"),
  name: "Kūrėjas & Co",
  bio: "Stories about the city",
  niche: "Design & culture",
};

describe("creator draft validation and migration", () => {
  it("loads a version-one legacy profile without inventing explicit offers or publication", () => {
    const value = parseCreatorDraft({
      version: 1,
      profile: {
        ...profile,
        published: true,
        email: "private@example.test",
        handleVerified: true,
      },
    });
    expect(value).toEqual({ ...profile, published: false });
    expect(value).not.toHaveProperty("email");
    expect(value).not.toHaveProperty("offers");
  });
  it.each([
    null,
    [],
    {},
    { version: 2, profile },
    { version: 1, profile: null },
    ...["name", "handle", "bio", "location", "niche"].flatMap((field) => [
      { version: 1, profile: { ...profile, [field]: undefined } },
      { version: 1, profile: { ...profile, [field]: { unexpected: true } } },
    ]),
    { version: 1, profile: { ...profile, bio: "x".repeat(501) } },
    { version: 1, profile: { ...profile, location: "x".repeat(101) } },
    { version: 1, profile: { ...profile, rate: NaN } },
    { version: 1, profile: { ...profile, rate: 1.001 } },
    { version: 1, profile: { ...profile, rate: -1 } },
    { version: 1, profile: { ...profile, offers: [] } },
  ])(
    "rejects malformed storage rather than returning crash-prone fields: %#",
    (value) => {
      expect(parseCreatorDraft(value)).toBeNull();
    },
  );
  it("validates optional offers against the legacy post rate", () => {
    expect(
      parseCreatorProfile({
        ...profile,
        offers: [builtinOffer("post", 50.01)],
      }),
    ).toBeNull();
    expect(
      parseCreatorProfile({
        ...profile,
        offers: [builtinOffer("banner", 199.99)],
      })?.offers?.[0].price,
    ).toBe(199.99);
    expect(
      parseCreatorProfile({ ...profile, offers: [builtinOffer("post", 50)] })
        ?.offers,
    ).toHaveLength(1);
  });
  it("canonicalizes an edited LinkedIn handle and discards a stale profile URL", () => {
    const value = parseCreatorProfile({
      ...profile,
      platform: "linkedin",
      handle: "new-handle",
      profileUrl: "https://linkedin.com/in/old-handle",
    });
    expect(value?.profileUrl).toBe("https://www.linkedin.com/in/new-handle");
    expect(
      parseCreatorProfile({ ...profile, profileUrl: "javascript:alert(1)" }),
    ).toBeNull();
    expect(
      parseCreatorProfile({
        ...profile,
        profileUrl: "https://x.com.evil.test/name",
      }),
    ).toBeNull();
  });
});

describe("creator identity and navigation", () => {
  it.each([
    "@vilnius_maker",
    "https://x.com/vilnius_maker?ref=test",
    "https://twitter.com/vilnius_maker/",
  ])("accepts an X handle or canonical profile URL", (value) => {
    expect(normalizeCreatorInput(value, "x")).toBe("vilnius_maker");
  });
  it("parses LinkedIn profiles while rejecting misleading hosts and credentials", () => {
    expect(
      normalizeCreatorInput(
        "https://www.linkedin.com/in/rokas-r/?trk=public",
        "linkedin",
      ),
    ).toBe("rokas-r");
    for (const url of [
      "https://linkedin.com.evil.test/in/rokas-r",
      "https://person@linkedin.com/in/rokas-r",
      "https://linkedin.com:444/in/rokas-r",
      "https://linkedin.com/company/acme",
    ])
      expect(normalizeCreatorInput(url, "linkedin")).toBeNull();
    expect(
      externalProfileUrl({ handle: "rokas-r", platform: "linkedin" }),
    ).toBe("https://www.linkedin.com/in/rokas-r");
  });
  it("keeps nested profile paths, query parameters and fragments when switching locale", () => {
    expect(
      creatorLocaleHref(
        "/en/creators/rokas",
        "lt",
        "?platform=linkedin&campaign=a",
        "#offers",
      ),
    ).toBe("/lt/creators/rokas?platform=linkedin&campaign=a#offers");
    expect(creatorLocaleHref("/lt/brands", "en", "", "#planner")).toBe(
      "/en/brands#planner",
    );
  });
});

describe("media-kit export", () => {
  it("escapes user text and renders every selected offer in the requested language", () => {
    const html = profileExport(
      {
        ...profile,
        name: '<script>alert("x")</script>',
        bio: '<img src=x onerror="alert(1)">',
        offers: [
          builtinOffer("banner", 199.99),
          {
            id: "custom",
            kind: "custom",
            title: "Renginio <reportažas>",
            price: 0,
            unit: "placement",
          },
        ],
      },
      "lt",
      "html",
    );
    expect(html).toContain('<html lang="lt">');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Profilio viršelis");
    expect(html).toContain("Renginio &lt;reportažas&gt;");
    expect(html).toContain("savaitę");
    expect(html).not.toContain("Reklaminis įrašas");
  });
  it("exports an explicit safe shape with precise cents, offers and canonical platform URL", () => {
    const input = {
      ...profile,
      platform: "linkedin" as const,
      handle: "new-name",
      profileUrl: "https://linkedin.com/in/old-name",
      offers: [builtinOffer("banner", 199.99)],
      email: "private@example.test",
      userId: "private-id",
    };
    const result = JSON.parse(
      profileExport(input, "en", "json", "2026-10-28T00:00:00Z"),
    );
    expect(result).toMatchObject({
      platform: "linkedin",
      profileUrl: "https://www.linkedin.com/in/new-name",
      currency: "EUR",
      exportedAt: "2026-10-28T00:00:00Z",
      handleVerified: false,
    });
    expect(result.offers[0].price).toBe(199.99);
    expect(JSON.parse(profileExport(input, "lt", "json")).offers[0].title).toBe(
      "Profilio viršelis",
    );
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("userId");
    const html = profileExport(input, "en", "html");
    expect(html).toContain("LinkedIn identity is unverified");
    expect(html).not.toContain("X identity is unverified");
  });
});
