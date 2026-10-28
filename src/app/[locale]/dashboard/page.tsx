import { CreatorDashboard } from "@/components/creator/CreatorDashboard";
import { asLocale } from "@/lib/locale";
import { staticPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = staticPageMetadata("dashboard");
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return <CreatorDashboard locale={locale} />;
}
