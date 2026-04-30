import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const locales = LOCALES;
export const defaultLocale: Locale = "en";

function parseAcceptLanguage(acceptLanguage: string): Locale {
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q] = lang.trim().split(";q=");
      return { code: code.trim(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    if (LOCALES.includes(code as Locale)) return code as Locale;
    if (code === "zh-TW" || code === "zh-Hant" || code === "zh-Hant-TW") return "zh-Hant";
    if (code === "zh-CN" || code === "zh-Hans" || code === "zh-Hans-CN") return "zh-Hans";
    if (code.startsWith("zh")) return "zh-Hans";
    if (code.startsWith("es")) return "es";
    if (code.startsWith("en")) return "en";
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const headerStore = await headers();

  // Middleware sets x-locale header from URL path (e.g. /convert/zh-Hans) or ?locale= param
  const overrideLocale = headerStore.get("x-locale");
  const locale =
    overrideLocale && LOCALES.includes(overrideLocale as Locale)
      ? (overrideLocale as Locale)
      : parseAcceptLanguage(headerStore.get("accept-language") || "");

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
