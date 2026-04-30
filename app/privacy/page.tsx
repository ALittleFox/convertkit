import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const revalidate = 31536000; // 1 year

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return {
    title: t("title"),
    description: t("subtitleDesc"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const technicalItems = t.raw("technicalItems") as string[];

  return (
    <div className="container py-10 px-4 sm:px-6 max-w-2xl mx-auto">
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
          <p className="text-muted-foreground leading-7 mt-2">
            {t("whyNotUploadDesc2")}
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
