import { notFound } from "next/navigation";
import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
import { normalizeHandle } from "@/lib/estimate";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return {
    title:
      (await params).locale === "lt"
        ? "Kūrėjų palyginimas"
        : "Creator comparison",
    robots: { index: false, follow: true },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; handle: string; opponent: string }>;
}) {
  const { locale, handle, opponent } = await params;
  if (!normalizeHandle(handle) || !normalizeHandle(opponent)) notFound();
  return (
    <WorthApp locale={asLocale(locale)} handle={handle} opponent={opponent} />
  );
}
