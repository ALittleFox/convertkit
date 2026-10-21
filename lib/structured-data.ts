import {
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  pageUrl,
} from "@/lib/site";
import { routing } from "@/i18n/routing";

/** Shape of one FAQ entry as stored in messages/*.json. */
export interface FaqEntry {
  q: string;
  a: string;
}

export interface PageSchemaInput {
  locale: string;
  /** Path relative to the locale segment, e.g. "/compress". Empty for home. */
  path: string;
  name: string;
  description: string;
  faq?: FaqEntry[];
  /** Only true for the landing page, which aggregates the tools. */
  isHome?: boolean;
}

/**
 * Builds a `@graph` document so all nodes share one @id namespace and can
 * cross-reference each other (WebSite -> WebPage -> WebApplication ->
 * BreadcrumbList). Google and Bing both accept a graph; a single combined
 * script is also smaller than several separate ones.
 */
export function buildPageSchema({
  locale,
  path,
  name,
  description,
  faq,
  isHome,
}: PageSchemaInput) {
  const url = pageUrl(locale, path);
  const inLanguage = OG_LOCALE[locale] ?? locale;
  const pageId = `${url}#webpage`;
  const appId = `${url}#app`;
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;

  // Every locale variant, so search engines tie translations together.
  const alternates = routing.locales.map((alt) =>
    alt === locale ? url : pageUrl(alt, path)
  );

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.ico`,
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage,
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": pageId,
      url,
      name,
      description,
      inLanguage,
      isPartOf: { "@id": siteId },
      about: { "@id": appId },
      // Declares the translated URLs of this same page.
      workTranslation: alternates
        .filter((alt) => alt !== url)
        .map((alt) => ({ "@type": "WebPage", url: alt })),
    },
    {
      // The tool itself. WebApplication is what makes this eligible for app
      // rich results and lets assistants answer "what does this tool do"
      // without inferring it from marketing copy.
      "@type": "WebApplication",
      "@id": appId,
      name,
      description,
      url,
      applicationCategory: "MultimediaApplication",
      applicationSubCategory: "File Converter",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and WebAssembly",
      inLanguage,
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      // The whole point of the product: nothing is uploaded.
      privacyPolicy: pageUrl(locale, "/privacy"),
      publisher: { "@id": orgId },
    },
  ];

  if (!isHome) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: SITE_NAME,
          item: pageUrl(locale),
        },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    });
  }

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.map((entry) => ({
        "@type": "Question",
        name: entry.q,
        acceptedAnswer: { "@type": "Answer", text: entry.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * Home page graph: adds the list of tools so crawlers/assistants can see the
 * site's scope without parsing the marketing sections.
 */
export function buildHomeSchema({
  locale,
  name,
  description,
  tools,
}: {
  locale: string;
  name: string;
  description: string;
  tools: { path: string; name: string; description: string }[];
}) {
  const base = buildPageSchema({ locale, path: "", name, description, isHome: true });
  const url = pageUrl(locale);

  (base["@graph"] as Record<string, unknown>[]).push({
    "@type": "ItemList",
    "@id": `${url}#tools`,
    name,
    itemListElement: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebApplication",
        name: tool.name,
        description: tool.description,
        url: pageUrl(locale, tool.path),
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
      },
    })),
  });

  return base;
}
