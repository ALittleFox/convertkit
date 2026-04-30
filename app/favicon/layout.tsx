import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("favicon");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t.raw("metaKeywords") as string[],
  };
}

export default function FaviconLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
