import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

export const revalidate = 31536000; // 1 year

/**
 * Pre-render every locale at build time. Combined with the locale being taken
 * from the URL (not from headers), this makes all pages static.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts this request into static rendering for the given locale.
  setRequestLocale(locale);

  // Pass the locale explicitly so messages resolve at build time.
  const messages = await getMessages({ locale });

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <HtmlLangSync />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
