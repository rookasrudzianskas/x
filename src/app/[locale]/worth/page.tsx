import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
import { staticPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = staticPageMetadata("worth");
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  return <WorthApp locale={locale} />;
}
