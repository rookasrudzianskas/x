import { CreatorDashboard } from "@/components/creator/CreatorDashboard";
import { asLocale } from "@/lib/locale";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <CreatorDashboard locale={asLocale((await params).locale)} />;
}
