import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Build a `generateMetadata` for a page namespace.
 *
 * The locale is read from the route params and passed explicitly to
 * `getTranslations`, which is required for static rendering: without it
 * next-intl would fall back to request headers and force the page dynamic.
 */
export function createPageMetadata(namespace: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    const safeLocale = (routing.locales as readonly string[]).includes(locale)
      ? locale
      : routing.defaultLocale;

    const t = await getTranslations({ locale: safeLocale, namespace });

    return {
      title: t("metaTitle"),
      description: t("metaDescription"),
      keywords: t.raw("metaKeywords") as string[],
    };
  };
}

export function PassthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}
