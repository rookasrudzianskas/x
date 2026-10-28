import { parseOfferPrice } from "@/lib/creator-offers";

export function campaignBudget(
  creators: number,
  posts: number,
  rateText: string,
  productionText: string,
) {
  const rate = parseOfferPrice(rateText);
  const production = parseOfferPrice(productionText);
  if (
    !Number.isInteger(creators) ||
    creators < 1 ||
    creators > 20 ||
    !Number.isInteger(posts) ||
    posts < 1 ||
    posts > 12 ||
    rate === null ||
    production === null
  )
    return null;
  const totalCents =
    creators * posts * Math.round(rate * 100) + Math.round(production * 100);
  return { rate, production, total: totalCents / 100 };
}
