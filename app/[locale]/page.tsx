import { Link } from "@/i18n/navigation";
import { Shrink, ArrowRightLeft, Palette, Film, Music, Shield, ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";

export const revalidate = 31536000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: "meta" });
  return {
    title: {
      default: t("rootTitle"),
      template: "%s | ConvertKit",
    },
    description: t("rootDescription"),
    keywords: t.raw("metaKeywords") as string[],
    authors: [{ name: "ConvertKit" }],
    openGraph: {
      type: "website",
      title: t("rootTitle"),
      description: t("ogDescription"),
      siteName: "ConvertKit",
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  setRequestLocale(safeLocale);

  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const features = [
    {
      href: "/compress",
      icon: Shrink,
      title: t("compressTitle"),
      desc: t("compressDesc"),
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      href: "/convert",
      icon: ArrowRightLeft,
      title: t("convertTitle"),
      desc: t("convertDesc"),
      color: "text-green-500 bg-green-500/10",
    },
    {
      href: "/favicon",
      icon: Palette,
      title: t("faviconTitle"),
      desc: t("faviconDesc"),
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      href: "/transcode",
      icon: Film,
      title: t("transcodeTitle"),
      desc: t("transcodeDesc"),
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      href: "/audio",
      icon: Music,
      title: t("audioTitle"),
      desc: t("audioDesc"),
      color: "text-pink-500 bg-pink-500/10",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container m-auto text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4 sm:px-6 bg-muted/40">
        <div className="container m-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Link key={f.href} href={f.href} className="group">
                <div className="h-full p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${f.color} mb-4`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-16 px-4 sm:px-6">
        <div className="container m-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 text-green-500 mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("privacyTitle")}</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {t("privacyDesc")}
          </p>
          <Link
            href="/privacy"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            {tc("privacy")}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
