import { notFound } from "next/navigation";
import { CreatorLanding } from "@/components/creator/CreatorLanding";
import { asLocale } from "@/lib/locale";
import { normalizeHandleSegment } from "@/lib/handle-route";
import { pageMetadata } from "@/lib/page-metadata";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale: language, handle: rawHandle } = await params;
  const handle = normalizeHandleSegment(rawHandle);
  if (!handle) notFound();
  const locale = asLocale(language);
  return pageMetadata(
    locale,
    `creators/${handle}`,
    `@${handle} · ${locale === "lt" ? "Kūrėjo puslapis" : "Creator page"}`,
    locale === "lt"
      ? "Kūrėjo pristatymas ir bendradarbiavimo pasiūlymai eurais."
      : "A creator media kit and collaboration offers in euros.",
    { image: `/api/card?lang=${locale}&page=creators`, noIndex: true },
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  const normalized = normalizeHandleSegment(handle);
  if (!normalized) notFound();
  return <CreatorLanding locale={asLocale(locale)} handle={normalized} />;
}
