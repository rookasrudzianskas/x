import {
  BUILTIN_OFFER_KINDS,
  builtinOffer,
  creatorOffersSchema,
  parseOfferPrice,
  profileOffers,
  type CreatorOffer,
} from "@/lib/creator-offers";
import type { CreatorProfile } from "./profile-data";

export type OfferDraft = Omit<CreatorOffer, "price"> & {
  price: string;
  enabled: boolean;
};
export function createOfferDrafts(profile: CreatorProfile): OfferDraft[] {
  const existing = profileOffers(profile);
  return [
    ...BUILTIN_OFFER_KINDS.map((kind) => {
      const offer = existing.find((item) => item.kind === kind);
      return {
        ...(offer ?? builtinOffer(kind)),
        price: offer ? String(offer.price) : "",
        enabled: !!offer,
      };
    }),
    ...existing
      .filter((offer) => offer.kind === "custom")
      .map((offer) => ({
        ...offer,
        price: String(offer.price),
        enabled: true,
      })),
  ];
}
export type OfferDraftResult =
  | { offers: CreatorOffer[]; error?: never; id?: never }
  | {
      offers?: never;
      error: "empty" | "amount" | "title" | "invalid";
      id?: string;
    };
export function readOfferDrafts(rows: OfferDraft[]): OfferDraftResult {
  const enabled = rows.filter((row) => row.enabled);
  if (!enabled.length) return { error: "empty" };
  const offers: CreatorOffer[] = [];
  for (const row of enabled) {
    const price = parseOfferPrice(row.price);
    if (price === null) return { error: "amount", id: row.id };
    if (!row.title.trim() || row.title.trim().length > 80)
      return { error: "title", id: row.id };
    offers.push({
      id: row.id,
      kind: row.kind,
      title: row.title.trim(),
      price,
      unit: row.unit,
    });
  }
  const result = creatorOffersSchema.safeParse(offers);
  return result.success ? { offers: result.data } : { error: "invalid" };
}
