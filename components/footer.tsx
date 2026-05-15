"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex flex-col items-center justify-center gap-1 h-auto py-3 m-auto px-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} huangmizhou. All rights reserved.
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          {t("translationDisclaimer")}
        </p>
      </div>
    </footer>
  );
}
