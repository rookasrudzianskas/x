import WorthApp from "@/components/worth/WorthApp";
import { asLocale } from "@/lib/locale";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <WorthApp locale={asLocale((await params).locale)} />;
}
