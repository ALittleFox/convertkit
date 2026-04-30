"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALES = [
  { value: "zh-Hans", label: "简体中文" },
  { value: "zh-Hant", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const LOCALE_VALUES = LOCALES.map((l) => l.value);

export function LanguageSwitcher() {
  const locale = useLocale();

  const handleChange = (newLocale: string | null) => {
    if (!newLocale) return;

    const segments = window.location.pathname.split("/").filter(Boolean);

    // URL pattern: /{feature}/{locale}
    if (segments.length >= 2 && LOCALE_VALUES.includes(segments[1])) {
      // Replace existing locale: /convert/zh-Hans → /convert/en
      segments[1] = newLocale;
    } else {
      // Insert locale: /convert → /convert/en
      segments.splice(1, 0, newLocale);
    }

    window.location.href = "/" + segments.join("/");
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-auto h-8 gap-1 border-0 bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground">
        <Globe className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
