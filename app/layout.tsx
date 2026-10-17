import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "./globals.css";

export const revalidate = 31536000; // 1 year

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  // Pass the locale explicitly so this runs at build time (static) instead of
  // falling back to request headers.
  const { locale } = await params;
  const safeLocale =
    locale && (routing.locales as readonly string[]).includes(locale)
      ? locale
      : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: "meta" });
  return {
    title: {
      default: t("rootTitle"),
      template: "%s | ConvertKit",
    },
    description: t("rootDescription"),
    keywords: t.raw("metaKeywords") as string[],
    authors: [{ name: "ConvertKit" }],
    other: {
      "baidu-site-verification": "codeva-fIhejOzbzb",
      "google-site-verification": "YmcZ6xh8ryQe9MJ49EI2du2VtIMKQNO7J9aaJTpckoM",
      "msvalidate.01": "A4CA2B0F9721A1F0451209FC4AEE933D",
    },
    openGraph: {
      type: "website",
      title: t("rootTitle"),
      description: t("ogDescription"),
      siteName: "ConvertKit",
    },
  };
}

/**
 * Minimal document shell. Providers and chrome live in `app/[locale]/layout.tsx`
 * so that the locale (and therefore the message bundle) is scoped to the route.
 */
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}>) {
  // Read from the URL rather than getLocale(): the latter depends on request
  // context and would make the whole tree dynamic.
  const { locale } = await params;
  const lang =
    locale && (routing.locales as readonly string[]).includes(locale)
      ? locale
      : routing.defaultLocale;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
