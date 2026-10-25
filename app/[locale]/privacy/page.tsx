import { Shield } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { pageUrl } from "@/lib/site";
import { OG_LOCALE, SITE_NAME } from "@/lib/site";

export const revalidate = 31536000; // 1 year

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: "privacy" });
  return {
    title: t("title"),
    description: t("subtitleDesc"),
    alternates: {
      canonical: pageUrl(safeLocale, "/privacy"),
      languages: {
        ...Object.fromEntries(
          routing.locales.map((alt) => [alt, pageUrl(alt, "/privacy")])
        ),
        "x-default": pageUrl(routing.defaultLocale, "/privacy"),
      },
    },
    openGraph: {
      type: "website",
      url: pageUrl(safeLocale, "/privacy"),
      siteName: SITE_NAME,
      title: t("title"),
      description: t("subtitleDesc"),
      locale: OG_LOCALE[safeLocale] ?? safeLocale,
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  setRequestLocale(safeLocale);

  const t = await getTranslations("privacy");
  const technicalItems = t.raw("technicalItems") as string[];

  return (
    <div className="container py-10 px-4 sm:px-6 max-w-2xl mx-auto">
      <JsonLd
        locale={safeLocale}
        path="/privacy"
        name={t("title")}
        description={t("subtitleDesc")}
      />
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="space-y-8">
        <section className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-3">{t("subtitle")}</h2>
          <p className="text-muted-foreground leading-7">{t("subtitleDesc")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{t("whyNotUpload")}</h2>
          <p className="text-muted-foreground leading-7">
            {t("whyNotUploadDesc")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{t("technical")}</h2>
          <ul className="list-disc pl-6 text-muted-foreground leading-7 space-y-2">
            {technicalItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{t("whatData")}</h2>
          <p className="text-muted-foreground leading-7">
            {t("whatDataDesc")}
          </p>
        </section>

        <section className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-3">{t("summary")}</h2>
          <p className="text-muted-foreground leading-7">{t("summaryDesc")}</p>
        </section>
      </div>
    </div>
  );
}
