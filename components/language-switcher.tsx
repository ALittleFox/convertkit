"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, string> = {
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  ar: "العربية",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  // Locale-aware: returns the path *without* the locale prefix, e.g. "/compress".
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={LOCALE_LABELS[locale]}
        aria-expanded={open}
        className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {LOCALE_LABELS[locale]}
      </button>
      <div
        hidden={!open}
        className="absolute right-0 mt-1 min-w-[120px] rounded-md border bg-popover p-1 shadow-md z-50"
      >
        {routing.locales.map((value) => (
          <Link
            key={value}
            href={pathname}
            locale={value}
            // Keep the switcher purely URL-driven: no cookie is written, so the
            // next visit to a bare path is negotiated from the browser again.
            onClick={() => setOpen(false)}
            className={cn(
              "block w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
              value === locale && "bg-accent text-accent-foreground font-medium"
            )}
          >
            {LOCALE_LABELS[value]}
          </Link>
        ))}
      </div>
    </div>
  );
}
