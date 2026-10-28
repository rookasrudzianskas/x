import { BrandPage } from "@/components/brands/BrandPage";
import { asLocale } from "@/lib/locale";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return {
    title:
      (await params).locale === "lt"
        ? "Planuok kūrėjų kampaniją"
        : "Plan a creator campaign",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <BrandPage locale={asLocale((await params).locale)} />;
}
