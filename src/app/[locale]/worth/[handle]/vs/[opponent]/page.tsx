import { notFound } from "next/navigation";
import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
import { normalizeHandleSegment } from "@/lib/handle-route";
import { pageMetadata } from "@/lib/page-metadata";
import { firstQueryValue } from "@/lib/report-query";
type Props = {
  params: Promise<{ locale: string; handle: string; opponent: string }>;
  searchParams: Promise<{
    report?: string | string[];
    otherReport?: string | string[];
  }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const {
    locale: language,
    handle: rawHandle,
    opponent: rawOpponent,
  } = await params;
  const handle = normalizeHandleSegment(rawHandle);
  const opponent = normalizeHandleSegment(rawOpponent);
  if (!handle || !opponent || handle.toLowerCase() === opponent.toLowerCase())
    notFound();
  const locale = asLocale(language);
  const query = new URLSearchParams({
    lang: locale,
    handle,
    compare: opponent,
  });
  const canonicalQuery = new URLSearchParams();
  const incoming = await searchParams;
  for (const key of ["report", "otherReport"] as const) {
    const value = firstQueryValue(incoming, key);
    if (value !== undefined) {
      query.set(key, value);
      canonicalQuery.set(key, value);
    }
  }
  return pageMetadata(
    locale,
    `worth/${handle}/vs/${opponent}`,
    locale === "lt" ? "Kūrėjų palyginimas" : "Creator comparison",
    `@${handle} / @${opponent} · ${locale === "lt" ? "Palygink bendradarbiavimo prielaidas ir vertę eurais." : "Compare sponsorship assumptions and value in euros."}`,
    { image: `/api/card?${query}`, query: canonicalQuery, noIndex: true },
  );
}
export default async function Page({ params }: Props) {
  const { locale, handle: rawHandle, opponent: rawOpponent } = await params;
  const handle = normalizeHandleSegment(rawHandle);
  const opponent = normalizeHandleSegment(rawOpponent);
  if (!handle || !opponent || handle.toLowerCase() === opponent.toLowerCase())
    notFound();
  return (
    <WorthApp locale={asLocale(locale)} handle={handle} opponent={opponent} />
  );
}
