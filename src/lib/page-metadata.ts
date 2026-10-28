import type { Metadata } from "next";
import { asLocale, type Locale } from "./locale";

const copy = {
  worth: {
    en: [
      "What is your audience worth?",
      "Explore your sponsorship value in euros with transparent assumptions and shareable reports, made for Vilnius creators.",
    ],
    lt: [
      "Kiek verta tavo auditorija?",
      "Įvertink reklaminio bendradarbiavimo vertę eurais. Skaidrios prielaidos ir dalijami rezultatai Vilniaus kūrėjams.",
    ],
  },
  creators: {
    en: [
      "For Vilnius creators",
      "Build a creator page, set your collaboration offers in euros and export a media kit in English or Lithuanian.",
    ],
    lt: [
      "Vilniaus kūrėjams",
      "Susikurk kūrėjo puslapį, nustatyk bendradarbiavimo įkainius eurais ir eksportuok pristatymą lietuvių arba anglų kalba.",
    ],
  },
  brands: {
    en: [
      "Plan a creator campaign",
      "Plan creator deliverables and a campaign budget in euros, with a Vilnius point of view.",
    ],
    lt: [
      "Planuok kūrėjų kampaniją",
      "Suplanuok kūrėjų darbus ir kampanijos biudžetą eurais iš Vilniaus perspektyvos.",
    ],
  },
  methodology: {
    en: [
      "Sources and methodology",
      "Read the formula, assumptions and sources behind the Vilnius sponsorship calculator.",
    ],
    lt: [
      "Šaltiniai ir metodika",
      "Susipažink su Vilniaus reklaminio bendradarbiavimo skaičiuoklės formule, prielaidomis ir šaltiniais.",
    ],
  },
  privacy: {
    en: [
      "Privacy information",
      "How Vilnius Worth handles saved reports, creator profiles and campaign inquiries.",
    ],
    lt: [
      "Privatumo informacija",
      "Kaip Vilnius Worth tvarko išsaugotus skaičiavimus, kūrėjų profilius ir kampanijų užklausas.",
    ],
  },
  terms: {
    en: [
      "Terms and limitations",
      "Understand the scope, estimates and service limitations of Vilnius Worth.",
    ],
    lt: [
      "Sąlygos ir apribojimai",
      "Susipažink su Vilnius Worth skaičiavimų paskirtimi ir paslaugų apribojimais.",
    ],
  },
  dashboard: {
    en: [
      "Your creator space",
      "Manage your creator profile, offers and media kit.",
    ],
    lt: [
      "Tavo kūrėjo erdvė",
      "Tvarkyk kūrėjo profilį, pasiūlymus ir pristatymą.",
    ],
  },
} as const;
export type PageKind = keyof typeof copy;
export function pageCopy(kind: PageKind, locale: Locale) {
  return copy[kind][locale];
}

export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  options: { image?: string; query?: URLSearchParams; noIndex?: boolean } = {},
): Metadata {
  const suffix = options.query?.size ? `?${options.query}` : "";
  const canonical = `/${locale}/${path}${suffix}`;
  const image = options.image || `/api/card?lang=${locale}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { en: `/en/${path}${suffix}`, lt: `/lt/${path}${suffix}` },
    },
    openGraph: {
      title: `${title} · Vilnius Worth`,
      description,
      url: canonical,
      siteName: "Vilnius Worth",
      locale: locale === "lt" ? "lt_LT" : "en_GB",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Vilnius Worth`,
      description,
      images: [image],
    },
    ...(options.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
export function staticPageMetadata(kind: PageKind) {
  return async ({ params }: { params: Promise<{ locale: string }> }) => {
    const locale = asLocale((await params).locale);
    const [title, description] = pageCopy(kind, locale);
    return pageMetadata(locale, kind, title, description, {
      image: `/api/card?lang=${locale}&page=${kind}`,
      noIndex: kind === "dashboard",
    });
  };
}
