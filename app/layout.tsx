import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

export const revalidate = 31536000; // 1 year

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
