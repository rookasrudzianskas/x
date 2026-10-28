import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
import { normalizeHandle } from "@/lib/estimate";
type Props = {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<{ report?: string }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const valid = normalizeHandle(handle);
  const report = (await searchParams).report;
  const query = new URLSearchParams({ lang: locale, handle: valid || "" });
  if (report && /^[0-9a-f-]{36}$/i.test(report)) query.set("report", report);
  const image = `/api/card?${query}`;
  return {
    title: valid
      ? `@${valid} · ${locale === "lt" ? "Reklaminė vertė" : "Sponsorship value"}`
      : "Profile",
    robots: { index: false, follow: true },
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
export default async function Page({ params }: Props) {
  const { locale, handle } = await params;
  if (!normalizeHandle(handle)) notFound();
  return <WorthApp locale={asLocale(locale)} handle={handle} />;
}
