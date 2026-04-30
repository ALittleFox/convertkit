import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["zh-Hans", "zh-Hant", "en", "es"];

export function middleware(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");

  if (locale && LOCALES.includes(locale)) {
    const response = NextResponse.next();
    response.headers.set("x-locale", locale);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
