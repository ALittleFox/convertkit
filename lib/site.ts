/** Canonical site origin. Used by the sitemap, robots and structured data. */
export const SITE_URL = "https://convertkit.huangmizhou.com";

export const SITE_NAME = "ConvertKit";

/**
 * Locales exposed in the URL -> BCP 47 tag used for structured data.
 * `zh-Hans` / `zh-Hant` are valid locale identifiers but not valid
 * `og:locale` / `inLanguage` values, which expect `lang_TERRITORY`.
 */
export const OG_LOCALE: Record<string, string> = {
  "zh-Hans": "zh_CN",
  "zh-Hant": "zh_TW",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  pt: "pt_BR",
  ar: "ar_SA",
};

export function pageUrl(locale: string, path = ""): string {
  return `${SITE_URL}/${locale}${path}`;
}
