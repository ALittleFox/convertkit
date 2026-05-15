import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es", "fr", "pt", "ar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Path-based locale: /convert/zh-Hans → extract "zh-Hans", rewrite to /convert
  const segments = pathname.split("/").filter(Boolean);
  const pathLocale = segments.length >= 2 ? segments[1] : null;

  if (pathLocale && LOCALES.includes(pathLocale)) {
    const basePath = "/" + segments[0];
    const url = request.nextUrl.clone();
    url.pathname = basePath;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-locale", pathLocale);
    return response;
  }

  // 2. Backward compatibility: ?locale= query param
  const queryLocale = request.nextUrl.searchParams.get("locale");
  if (queryLocale && LOCALES.includes(queryLocale)) {
    const response = NextResponse.next();
    response.headers.set("x-locale", queryLocale);
    return response;
  }

  // 3. No locale → pass through (Accept-Language fallback in i18n/request.ts)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
