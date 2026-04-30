import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("audio");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: t.raw("metaKeywords") as string[],
  };
}

export default function AudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
