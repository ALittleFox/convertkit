import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export function createPageMetadata(namespace: string) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations(namespace);
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
