import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const LOCALES = routing.locales;
const DEFAULT_LOCALE = routing.defaultLocale;

/**
 * Pick a locale from an Accept-Language header.
 *
 * Mirrors the matching rules the app used before static generation (region
 * overrides such as zh-TW → zh-Hant, otherwise first-segment match).
 * No cookies are involved: the language is always derived from the browser /
 * OS setting, never from a stored preference.
 */
function negotiate(acceptLanguage: string): string {
  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [code, q] = part.trim().split(";q=");
      return { code: code.trim(), q: q ? parseFloat(q) : 1 };
    })
    .filter((entry) => entry.code.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    if ((LOCALES as readonly string[]).includes(code)) return code;

    // Regional Chinese: traditional in TW/HK/MO, simplified elsewhere.
    if (code === "zh-TW" || code === "zh-Hant" || code === "zh-Hant-TW") return "zh-Hant";
    if (code === "zh-HK" || code === "zh-MO") return "zh-Hant";
    if (code === "zh-CN" || code === "zh-Hans" || code === "zh-Hans-CN") return "zh-Hans";
    if (code.startsWith("zh")) return "zh-Hans";

    for (const locale of LOCALES) {
      // "pt-BR" → "pt", "es-419" → "es", ...
      if (code.split("-")[0] === locale) return locale;
    }
  }

  return DEFAULT_LOCALE;
}

function isLocale(segment: string | undefined): boolean {
  return !!segment && (LOCALES as readonly string[]).includes(segment);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // 1) Already prefixed with a locale → serve the static page as-is.
  if (isLocale(segments[0])) return NextResponse.next();

  // 2) Legacy URL shape from before the migration: /compress/zh-Hans
  //    The locale is explicit here, so a permanent (301) redirect is safe.
  if (segments.length >= 2 && isLocale(segments[1])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${segments[1]}/${segments[0]}`;
    return NextResponse.redirect(url, 301);
  }

  // 3) No locale in the URL → negotiate from the browser and redirect.
  //    Must be a temporary redirect: the same URL resolves to different
  //    locales for different visitors, and a 301 would be cached permanently
  //    by browsers/CDNs, pinning everyone to whichever locale was seen first.
  const locale = negotiate(request.headers.get("accept-language") ?? "");
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url, 307);
  // Prevent shared caches from serving one visitor's locale to another.
  response.headers.set("Vary", "Accept-Language");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
