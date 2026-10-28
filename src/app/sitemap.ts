import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/locale";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["en", "lt"].flatMap((locale) =>
    ["worth", "creators", "brands", "methodology", "privacy", "terms"].map(
      (path) => ({
        url: new URL(`/${locale}/${path}`, appUrl()).toString(),
        alternates: {
          languages: {
            en: new URL(`/en/${path}`, appUrl()).toString(),
            lt: new URL(`/lt/${path}`, appUrl()).toString(),
          },
        },
      }),
    ),
  );
}
