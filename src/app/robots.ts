import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/locale";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/en/dashboard",
        "/lt/dashboard",
        "/en/worth/",
        "/lt/worth/",
      ],
    },
    sitemap: new URL("/sitemap.xml", appUrl()).toString(),
  };
}
