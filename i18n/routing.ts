import { defineRouting } from "next-intl/routing";

/**
 * Single source of truth for supported locales and URL strategy.
 *
 * `localePrefix: "always"` keeps the locale in the URL for every page
 * (`/zh-Hans/compress`). That is what makes static generation possible: each
 * locale becomes a distinct, cacheable HTML document instead of the server
 * having to guess a language per request from Accept-Language.
 *
 * The bare paths (`/compress`) are answered by `proxy.ts`, which negotiates a
 * locale from the browser and redirects. See STATIC_I18N_MIGRATION.md.
 */
export const routing = defineRouting({
  locales: ["zh-Hans", "zh-Hant", "en", "es", "fr", "pt", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
  // The negotiation redirect must not be cached per-URL across users.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
