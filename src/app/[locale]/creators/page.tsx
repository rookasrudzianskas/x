import { CreatorLanding } from "@/components/creator/CreatorLanding";
import { asLocale } from "@/lib/locale";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return {
    title:
      (await params).locale === "lt"
        ? "Vilniaus kūrėjams"
        : "For Vilnius creators",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <CreatorLanding locale={asLocale((await params).locale)} />;
}
