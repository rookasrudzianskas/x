import {
  creatorOffersSchema,
  isCentAmount,
  offerTitle,
  offerUnit,
  profileOffers,
  type CreatorOffer,
} from "@/lib/creator-offers";

export type Locale = "en" | "lt";
export type CreatorProfile = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  niche: string;
  rate: number;
  published: boolean;
  platform?: "x" | "linkedin";
  profileUrl?: string;
  offers?: CreatorOffer[];
};
export const DRAFT_KEY = "vilnius-worth.creator-draft.v1";
export const copy = <T>(locale: Locale, en: T, lt: T): T =>
  locale === "lt" ? lt : en;
export const euro = (value: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
export const emptyProfile = (handle = ""): CreatorProfile => ({
  name: "",
  handle,
  bio: "",
  location: "Vilnius, Lithuania",
  niche: "",
  rate: 50,
  published: false,
  platform: "x",
});

export function normalizeCreatorInput(
  value: string,
  platform: "x" | "linkedin",
): string | null {
  const raw = value.trim();
  if (platform === "linkedin") {
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !["linkedin.com", "www.linkedin.com"].includes(url.hostname) ||
        url.username ||
        url.password ||
        url.port
      )
        return null;
      return (
        url.pathname.match(/^\/in\/([A-Za-z0-9-]{3,100})\/?$/)?.[1] ?? null
      );
    } catch {
      return null;
    }
  }
  const match = raw.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/@?([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i,
  );
  const handle = match?.[1] ?? raw.replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

export function externalProfileUrl(
  profile: Pick<CreatorProfile, "handle" | "platform">,
): string {
  return profile.platform === "linkedin"
    ? `https://www.linkedin.com/in/${encodeURIComponent(profile.handle)}`
    : `https://x.com/${encodeURIComponent(profile.handle)}`;
}

export function parseCreatorProfile(value: unknown): CreatorProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  const boundedString = (key: string, max: number, required = false) =>
    typeof profile[key] === "string" &&
    (profile[key] as string).length <= max &&
    (!required || (profile[key] as string).trim().length > 0);
  if (
    !boundedString("name", 80, true) ||
    !boundedString("handle", 100, true) ||
    !boundedString("bio", 500) ||
    !boundedString("location", 100) ||
    !boundedString("niche", 100)
  )
    return null;
  if (
    typeof profile.rate !== "number" ||
    !isCentAmount(profile.rate) ||
    typeof profile.published !== "boolean"
  )
    return null;
  if (
    profile.platform !== undefined &&
    profile.platform !== "x" &&
    profile.platform !== "linkedin"
  )
    return null;
  const platform = profile.platform === "linkedin" ? "linkedin" : "x";
  if (
    !(
      platform === "linkedin" ? /^[A-Za-z0-9-]{3,100}$/ : /^[A-Za-z0-9_]{1,15}$/
    ).test(profile.handle as string)
  )
    return null;
  if (profile.profileUrl !== undefined) {
    if (
      typeof profile.profileUrl !== "string" ||
      profile.profileUrl.length > 300
    )
      return null;
    if (profile.profileUrl) {
      try {
        const url = new URL(profile.profileUrl);
        const hosts =
          platform === "linkedin"
            ? ["linkedin.com", "www.linkedin.com"]
            : ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.port ||
          !hosts.includes(url.hostname)
        )
          return null;
      } catch {
        return null;
      }
    }
  }
  const offers =
    profile.offers === undefined
      ? undefined
      : creatorOffersSchema.safeParse(profile.offers);
  if (offers && !offers.success) return null;
  const parsedOffers = offers?.success ? offers.data : undefined;
  const post = parsedOffers?.find((offer) => offer.kind === "post");
  if (post && post.price !== profile.rate) return null;
  return {
    name: profile.name as string,
    handle: profile.handle as string,
    bio: profile.bio as string,
    location: profile.location as string,
    niche: profile.niche as string,
    rate: profile.rate,
    published: profile.published,
    platform,
    ...(profile.profileUrl
      ? {
          profileUrl: externalProfileUrl({
            platform,
            handle: profile.handle as string,
          }),
        }
      : {}),
    ...(parsedOffers ? { offers: parsedOffers } : {}),
  };
}

export function parseCreatorDraft(value: unknown): CreatorProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (entry.version !== 1) return null;
  const profile = parseCreatorProfile(entry.profile);
  return profile ? { ...profile, published: false } : null;
}

export function creatorLocaleHref(
  pathname: string,
  locale: Locale,
  search = "",
  hash = "",
) {
  const path = /^\/(en|lt)(\/|$)/.test(pathname)
    ? pathname.replace(/^\/(en|lt)/, `/${locale}`)
    : `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  return `${path}${search}${hash}`;
}

export function profileExport(
  profile: CreatorProfile,
  locale: Locale,
  format: "json" | "html",
  exportedAt = new Date().toISOString(),
): string {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const offers = profileOffers(profile);
  const platform = profile.platform === "linkedin" ? "LinkedIn" : "X";
  const identity =
    profile.platform === "linkedin"
      ? `linkedin.com/in/${profile.handle}`
      : `@${profile.handle}`;
  const url = externalProfileUrl(profile);
  if (format === "json")
    return JSON.stringify(
      {
        schemaVersion: 1,
        locale,
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        location: profile.location,
        niche: profile.niche,
        rate: profile.rate,
        offers: offers.map((offer) => ({
          ...offer,
          title: offerTitle(offer, locale),
        })),
        platform: profile.platform ?? "x",
        profileUrl: url,
        published: profile.published,
        handleVerified: false,
        currency: "EUR",
        exportedAt,
      },
      null,
      2,
    );
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(profile.name)} — ${copy(locale, "Media kit", "Kūrėjo pristatymas")}</title><style>body{font:18px/1.6 system-ui;max-width:760px;margin:8vh auto;padding:32px;color:#1a1a1a}h1{font-size:clamp(32px,7vw,54px);line-height:1.1;overflow-wrap:anywhere}header{border-bottom:8px solid #03f;padding-bottom:32px}small{color:#6e6e6e}a,strong{color:#03f}p{white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:16px;margin:28px 0}th,td{padding:14px 0;border-bottom:1px solid #e8e8e8;text-align:left}td:last-child,th:last-child{text-align:right}td:first-child{overflow-wrap:anywhere}td:last-child{white-space:nowrap}caption{text-align:left;font-weight:600;padding-bottom:12px}@media print{body{margin:0;padding:20px}}</style></head><body><main><header><small>VILNIUS · ${copy(locale, "CREATOR MEDIA KIT", "KŪRĖJO PRISTATYMAS")}</small><h1>${escape(profile.name)}</h1><p><a href="${escape(url)}" rel="noopener noreferrer">${escape(identity)}</a> · ${escape(profile.location)}</p></header><h2>${escape(profile.niche)}</h2><p>${escape(profile.bio)}</p><table><caption>${copy(locale, "Creative offers", "Kūrybiniai pasiūlymai")}</caption><thead><tr><th scope="col">${copy(locale, "Offer", "Pasiūlymas")}</th><th scope="col">${copy(locale, "Your rate", "Tavo įkainis")}</th></tr></thead><tbody>${offers.map((offer) => `<tr><td>${escape(offerTitle(offer, locale))}</td><td><strong>${euro(offer.price, locale)}</strong> / ${offerUnit(offer.unit, locale)}</td></tr>`).join("")}</tbody></table><small>${copy(locale, `Self-reported profile. Rates and deliverables are subject to agreement. ${platform} identity is unverified.`, `Kūrėjo pateikti duomenys. Įkainiai ir darbai derinami individualiai. ${platform} tapatybė nepatvirtinta.`)}</small></main></body></html>`;
}
