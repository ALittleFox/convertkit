import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/json-ld";
import { OG_LOCALE, SITE_NAME, SITE_URL, pageUrl } from "@/lib/site";
import type { FaqEntry } from "@/lib/structured-data";

function safeLocale(locale: string): string {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

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
    const safe = safeLocale(locale);

    const t = await getTranslations({ locale: safe, namespace });

    return {
      title: t("metaTitle"),
      description: t("metaDescription"),
      keywords: t.raw("metaKeywords") as string[],
      alternates: {
        canonical: pageUrl(safe, `/${namespace}`),
        languages: {
          ...Object.fromEntries(
            routing.locales.map((alt) => [alt, pageUrl(alt, `/${namespace}`)])
          ),
          // Recommended fallback for visitors whose language we don't serve.
          "x-default": pageUrl(routing.defaultLocale, `/${namespace}`),
        },
      },
      openGraph: {
        type: "website",
        url: pageUrl(safe, `/${namespace}`),
        siteName: SITE_NAME,
        title: t("metaTitle"),
        description: t("metaDescription"),
        locale: OG_LOCALE[safe] ?? safe,
      },
    };
  };
}

/**
 * Layout for a tool page: emits the page's JSON-LD graph (WebPage +
 * WebApplication + BreadcrumbList + FAQPage) and passes children through.
 *
 * Done here rather than in the page because pages are client components and
 * cannot call `getTranslations`; the FAQ questions are read from the same
 * message namespace that `components/faq.tsx` renders, so the markup and the
 * structured data can never disagree.
 */
export function createPageLayout(namespace: string) {
  return async function PageLayout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    const safe = safeLocale(locale);
    const t = await getTranslations({ locale: safe, namespace });

    return (
      <>
        <JsonLd
          locale={safe}
          path={`/${namespace}`}
          name={t("metaTitle")}
          description={t("metaDescription")}
          faq={t.raw("faqItems") as FaqEntry[] | undefined}
        />
        {children}
      </>
    );
  };
}

export function PassthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export { SITE_URL };
