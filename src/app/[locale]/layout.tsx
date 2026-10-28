import type { Metadata } from "next";
import localFont from "next/font/local";
import { asLocale, appUrl } from "@/lib/locale";
import "../globals.css";

const pixel = localFont({
  src: "../../../public/reference/new-pixel.woff2",
  variable: "--font-pixel",
  display: "swap",
});
const inter = localFont({
  src: [
    {
      path: "../../../public/reference/inter-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../../public/reference/inter-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const title =
    locale === "lt"
      ? "Kiek verta tavo auditorija? · Vilnius"
      : "What is your audience worth? · Vilnius";
  const description =
    locale === "lt"
      ? "Vilniaus kūrėjų reklaminio bendradarbiavimo skaičiuoklė eurais. Skaidrios prielaidos, dalijami rezultatai ir kūrėjų profiliai."
      : "Explore your sponsorship value in euros. A creator calculator for Vilnius, with transparent assumptions, shareable reports and creator profiles.";
  return {
    metadataBase: appUrl(),
    title: { default: title, template: "%s · Vilnius Worth" },
    description,
    openGraph: {
      title,
      description,
      locale: locale === "lt" ? "lt_LT" : "en_GB",
      type: "website",
      siteName: "Vilnius Worth",
      images: [{ url: `/api/card?lang=${locale}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/card?lang=${locale}`],
    },
    icons: { icon: "/favicon.svg" },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${pixel.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
