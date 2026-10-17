import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es", "fr", "pt", "ar"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // 1. Feature page with locale: /compress/zh-Hans → rewrite to /compress
  if (segments.length >= 2) {
    const pathLocale = segments[1];
    if (LOCALES.includes(pathLocale)) {
      const basePath = "/" + segments[0];
      const url = request.nextUrl.clone();
      url.pathname = basePath;
      const response = NextResponse.rewrite(url);
      response.headers.set("x-locale", pathLocale);
      return response;
    }
  }

  // 2. Home page with locale: /zh-Hans → rewrite to /
  if (segments.length === 1 && LOCALES.includes(segments[0])) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const response = NextResponse.rewrite(url);
    response.headers.set("x-locale", segments[0]);
    return response;
  }

  // 3. Backward compatibility: ?locale= query param
  const queryLocale = request.nextUrl.searchParams.get("locale");
  if (queryLocale && LOCALES.includes(queryLocale)) {
    const response = NextResponse.next();
    response.headers.set("x-locale", queryLocale);
    return response;
  }

  // 4. No locale → pass through (Accept-Language fallback in i18n/request.ts)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
