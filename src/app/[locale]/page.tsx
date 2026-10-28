import { redirect } from "next/navigation";
import { asLocale } from "@/lib/locale";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  redirect(`/${asLocale((await params).locale)}/worth`);
}
