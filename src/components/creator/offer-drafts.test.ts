import { describe, expect, it } from "vitest";
import {
  builtinOffer,
  creatorOffersSchema,
  parseOfferPrice,
  profileOffers,
  offerTitle,
  type CreatorOffer,
} from "@/lib/creator-offers";
import { createOfferDrafts, readOfferDrafts } from "./offer-drafts";
import { emptyProfile } from "./profile-data";

describe("offer editing", () => {
  it("migrates legacy post pricing without enabling other formats", () => {
    const rows = createOfferDrafts({ ...emptyProfile(), rate: 25.5 });
    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => row.enabled)).toHaveLength(1);
    expect(readOfferDrafts(rows)).toEqual({
      offers: [builtinOffer("post", 25.5)],
    });
  });
  it("does not re-add a disabled post when a profile explicitly offers only a banner", () => {
    const profile = {
      ...emptyProfile(),
      offers: [builtinOffer("banner", 55.25)],
    };
    expect(profileOffers(profile).map((offer) => offer.kind)).toEqual([
      "banner",
    ]);
    const rows = createOfferDrafts(profile);
    expect(rows.find((row) => row.kind === "post")?.enabled).toBe(false);
    expect(readOfferDrafts(rows)).toEqual({ offers: profile.offers });
  });
  it("keeps custom names across locales while localizing built-in titles", () => {
    const custom: CreatorOffer = {
      id: "custom-1",
      kind: "custom",
      title: "My city walk",
      price: 15.5,
      unit: "placement",
    };
    const result = readOfferDrafts(
      createOfferDrafts({ ...emptyProfile(), offers: [custom] }),
    );
    expect(result.offers?.[0]).toEqual(custom);
    expect(offerTitle(custom, "lt")).toBe("My city walk");
    expect(offerTitle(builtinOffer("post"), "lt")).toBe("Reklaminis įrašas");
  });
  it("requires an enabled service and identifies its invalid amount", () => {
    const rows = createOfferDrafts(emptyProfile());
    expect(
      readOfferDrafts(rows.map((row) => ({ ...row, enabled: false }))),
    ).toMatchObject({ error: "empty" });
    expect(
      readOfferDrafts(
        rows.map((row) => (row.kind === "post" ? { ...row, price: "" } : row)),
      ),
    ).toEqual({ error: "amount", id: "post" });
  });
  it.each([
    "",
    " ",
    "-1",
    "1.001",
    "1,234.50",
    "1e3",
    "Infinity",
    "1000000.01",
  ])("rejects ambiguous, missing or out-of-range prices: %s", (value) => {
    expect(parseOfferPrice(value)).toBeNull();
  });
  it.each([
    ["0", 0],
    ["12,34", 12.34],
    ["12.34", 12.34],
    ["1000000.00", 1_000_000],
  ])("accepts exact euro cents: %s", (value, expected) => {
    expect(parseOfferPrice(value as string)).toBe(expected);
  });
  it("rejects duplicate IDs and too many custom offers", () => {
    expect(
      creatorOffersSchema.safeParse([
        { ...builtinOffer("post"), price: 0.000000001 },
      ]).success,
    ).toBe(false);
    expect(
      creatorOffersSchema.safeParse([
        builtinOffer("post"),
        { ...builtinOffer("banner"), id: "post" },
      ]).success,
    ).toBe(false);
    expect(
      creatorOffersSchema.safeParse(
        Array.from({ length: 4 }, (_, index) => ({
          id: `custom-${index}`,
          kind: "custom",
          title: "Custom",
          price: 0,
          unit: "week",
        })),
      ).success,
    ).toBe(false);
  });
});
