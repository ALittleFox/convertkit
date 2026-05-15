import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://convertkit.huangmizhou.com";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es", "fr", "pt", "ar", ""];

const PAGES = [
  { path: "/compress", priority: 1.0 },
  { path: "/convert", priority: 0.9 },
  { path: "/transcode", priority: 0.9 },
  { path: "/audio", priority: 0.8 },
  { path: "/favicon", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of PAGES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${page.path}${locale?'/':''}${locale}`,
        priority: page.priority,
      });
    }
  }

  return entries;
}
