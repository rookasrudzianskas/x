import { z } from "zod";

export const OFFER_KINDS = [
  "post",
  "repost",
  "quote",
  "banner",
  "bio",
  "badge",
  "custom",
] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];
export type BuiltinOfferKind = Exclude<OfferKind, "custom">;
export const BUILTIN_OFFER_KINDS = OFFER_KINDS.filter(
  (kind): kind is BuiltinOfferKind => kind !== "custom",
);

export function isCentAmount(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1_000_000 &&
    value === Math.round(value * 100) / 100
  );
}

export const creatorOfferSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    kind: z.enum(OFFER_KINDS),
    title: z.string().trim().min(1).max(80),
    price: z.number().refine(isCentAmount, {
      message:
        "Use an amount from 0 to 1,000,000 with at most two decimal places.",
    }),
    unit: z.enum(["placement", "week"]),
  })
  .strict();

export const creatorOffersSchema = z
  .array(creatorOfferSchema)
  .min(1)
  .max(9)
  .superRefine((offers, context) => {
    const ids = new Set<string>();
    const kinds = new Set<OfferKind>();
    let customs = 0;
    for (const [index, offer] of offers.entries()) {
      if (ids.has(offer.id))
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Offer IDs must be unique.",
        });
      ids.add(offer.id);
      if (offer.kind === "custom") customs += 1;
      else {
        if (kinds.has(offer.kind))
          context.addIssue({
            code: "custom",
            path: [index, "kind"],
            message: "Each built-in offer can only appear once.",
          });
        kinds.add(offer.kind);
      }
    }
    if (customs > 3)
      context.addIssue({
        code: "custom",
        message: "Add at most three custom offers.",
      });
  });
export type CreatorOffer = z.infer<typeof creatorOfferSchema>;

const TITLES: Record<OfferKind, [string, string]> = {
  post: ["Sponsored post", "Reklaminis įrašas"],
  repost: ["Repost", "Pasidalijimas įrašu"],
  quote: ["Quote post", "Įrašas su komentaru"],
  banner: ["Profile banner", "Profilio viršelis"],
  bio: ["Link in bio", "Nuoroda aprašyme"],
  badge: ["Brand badge", "Prekių ženklo ženklelis"],
  custom: ["Custom offer", "Individualus pasiūlymas"],
};

export function offerTitle(
  offer: Pick<CreatorOffer, "kind" | "title">,
  locale: "en" | "lt",
): string {
  return offer.kind === "custom"
    ? offer.title
    : TITLES[offer.kind][locale === "lt" ? 1 : 0];
}
export function offerUnit(
  unit: CreatorOffer["unit"],
  locale: "en" | "lt",
): string {
  return unit === "week"
    ? locale === "lt"
      ? "savaitę"
      : "week"
    : locale === "lt"
      ? "paskelbimą"
      : "placement";
}
export function builtinOffer(kind: BuiltinOfferKind, price = 0): CreatorOffer {
  return {
    id: kind,
    kind,
    title: TITLES[kind][0],
    price,
    unit: ["banner", "bio", "badge"].includes(kind) ? "week" : "placement",
  };
}
export function profileOffers(profile: {
  rate: number;
  offers?: CreatorOffer[];
}): CreatorOffer[] {
  return profile.offers ?? [builtinOffer("post", profile.rate)];
}
export function parseOfferPrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return isCentAmount(number) ? number : null;
}
