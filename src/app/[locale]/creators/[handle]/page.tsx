import { notFound } from "next/navigation";
import { CreatorLanding } from "@/components/creator/CreatorLanding";
import { asLocale } from "@/lib/locale";
import { normalizeHandle } from "@/lib/estimate";
export const metadata = { robots: { index: false, follow: true } };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  if (!normalizeHandle(handle)) notFound();
  return <CreatorLanding locale={asLocale(locale)} handle={handle} />;
}
