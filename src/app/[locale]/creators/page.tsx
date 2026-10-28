import { CreatorLanding } from "@/components/creator/CreatorLanding";
import { asLocale } from "@/lib/locale";
import { staticPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = staticPageMetadata("creators");
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return <CreatorLanding locale={locale} />;
}
