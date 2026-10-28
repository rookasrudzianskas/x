import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
import { normalizeHandleSegment } from "@/lib/handle-route";
import { pageMetadata } from "@/lib/page-metadata";
import { firstQueryValue } from "@/lib/report-query";
type Props = {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<{ report?: string | string[] }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale: language, handle } = await params;
  const locale = asLocale(language);
  const valid = normalizeHandleSegment(handle);
  const report = firstQueryValue(await searchParams, "report");
  const query = new URLSearchParams({ lang: locale, handle: valid || "" });
  if (report !== undefined) query.set("report", report);
  const image = `/api/card?${query}`;
  const canonicalQuery = new URLSearchParams();
  if (query.has("report")) canonicalQuery.set("report", query.get("report")!);
  return pageMetadata(
    locale,
    `worth/${valid || handle}`,
    valid
      ? `@${valid} · ${locale === "lt" ? "Reklaminė vertė" : "Sponsorship value"}`
      : "Profile",
    locale === "lt"
      ? "Pavyzdinis reklaminio bendradarbiavimo skaičiavimas eurais. Peržiūrėk ir keisk prielaidas."
      : "An illustrative sponsorship estimate in euros. Review and adjust the assumptions.",
    { image, query: canonicalQuery, noIndex: true },
  );
}
export default async function Page({ params }: Props) {
  const { locale, handle } = await params;
  const normalized = normalizeHandleSegment(handle);
  if (!normalized) notFound();
  return <WorthApp locale={asLocale(locale)} handle={normalized} />;
}
