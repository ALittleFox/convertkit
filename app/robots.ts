import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "Baiduspider",
  "YandexBot",
  "Sogou",
  "360Spider",
  "Bytespider",
  "Applebot",
  "DuckDuckBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...CRAWLERS.map((crawler) => ({
        userAgent: crawler,
        allow: "/",
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
