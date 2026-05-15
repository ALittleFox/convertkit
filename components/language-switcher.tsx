"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';

const LOCALES = [
  { value: "zh-Hans", label: "简体中文" },
  { value: "zh-Hant", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
];

const LOCALE_VALUES = LOCALES.map((l) => l.value);

function buildLocalePath(pathname: string, locale: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length >= 2 && LOCALE_VALUES.includes(segments[1])) {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }

  return "/" + segments.join("/");
}

export function LanguageSwitcher() {
  const locale = useLocale();
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

  const current = LOCALES.find((l) => l.value === locale);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm"
      >
        <Globe className="h-4 w-4" />
        {current?.label}
      </button>
      <div
        hidden={!open}
        className="absolute right-0 mt-1 min-w-[120px] rounded-md border bg-popover p-1 shadow-md z-50"
      >
        {LOCALES.map((l) => (
          <a
            key={l.value}
            href={buildLocalePath(pathname, l.value)}
            className={cn(
              "block w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
              l.value === locale && "bg-accent text-accent-foreground font-medium"
            )}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
