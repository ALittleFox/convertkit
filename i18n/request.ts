import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Resolves messages for the locale carried by the URL segment.
 *
 * This must NOT read `headers()`: any dynamic API here forces every page in the
 * tree to render per request, which defeats static generation and made the
 * `revalidate` exports no-ops. The locale now comes purely from the route
 * (`app/[locale]/...`), so pages can be prerendered at build time.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
