import { notFound } from "next/navigation";

export type Locale = "en" | "lt";

export function asLocale(locale: string): Locale {
  if (locale !== "en" && locale !== "lt") notFound();
  return locale;
}

export function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(configured);
  } catch {
    return new URL("http://localhost:3000");
  }
}
