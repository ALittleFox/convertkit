"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface FaqProps {
  /** Message namespace the FAQ strings live under (e.g. "compress"). */
  namespace: string;
}

interface FaqItem {
  q: string;
  a: string;
}

/**
 * FAQ block rendered below the intro/privacy card.
 *
 * Uses native <details>/<summary> on purpose: it works without JS, is
 * keyboard accessible by default, and needs no extra dependency. Content is
 * still server-rendered, so the answers are in the static HTML for crawlers.
 */
export function Faq({ namespace }: FaqProps) {
  const t = useTranslations(namespace);
  const items = t.raw("faqItems") as FaqItem[] | undefined;

  if (!items?.length) return null;

  return (
    <section aria-labelledby="faq-heading" className="space-y-3">
      <h2 id="faq-heading" className="text-lg font-semibold">
        {t("faqTitle")}
      </h2>
      <div className="space-y-2">
        {items.map((item, index) => (
          <details
            key={index}
            className="group rounded-xl border bg-card px-4 open:bg-muted/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-3 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
