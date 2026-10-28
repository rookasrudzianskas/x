import InfoPage from "@/components/InfoPage";
import { asLocale } from "@/lib/locale";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <InfoPage locale={asLocale((await params).locale)} kind="terms" />;
}
