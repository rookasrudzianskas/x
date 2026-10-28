import InfoPage from "@/components/InfoPage";
import { asLocale } from "@/lib/locale";
import { staticPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = staticPageMetadata("terms");
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return <InfoPage locale={locale} kind="terms" />;
}
