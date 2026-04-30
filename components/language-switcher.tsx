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

export function LanguageSwitcher() {
  const locale = useLocale();

  const handleChange = (newLocale: string | null) => {
    if (!newLocale) return;
    const url = new URL(window.location.href);
    url.searchParams.set("locale", newLocale);
    window.location.href = url.toString();
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
