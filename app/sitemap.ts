import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://convertkit.huangmizhou.com";

/** Public pages, relative to the locale segment. */
const PAGES = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/compress", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/convert", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/favicon", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/transcode", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/audio", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
];

/**
 * Generated from the routing config so it can never drift from the actual
 * routes (the previous public/sitemap.xml was hand-maintained and still used
 * the pre-migration URL shape).
 *
 * Each entry carries `alternates.languages`, which Next.js renders as
 * `<xhtml:link rel="alternate" hreflang="...">` — required so search engines
 * know the locale variants are translations of each other, not duplicates.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${BASE_URL}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [
            alt,
            `${BASE_URL}/${alt}${page.path}`,
          ])
        ),
      },
    }))
  );
}
