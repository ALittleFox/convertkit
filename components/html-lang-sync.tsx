"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Keeps `<html lang>` / `dir` in sync with the active locale.
 *
 * Why this exists: `<html>` must be rendered by the root layout, but the root
 * layout sits *above* `app/[locale]`, so it cannot know the locale and always
 * emits the default (`en`, LTR). Emitting `<html>` from the locale layout
 * instead would break static generation (Next requires the root layout to own
 * the document shell), so the attribute is corrected after hydration.
 *
 * The static HTML still declares a valid `lang`, and crawlers execute JS, so
 * this is a pragmatic trade-off. If Next ever lets the nested layout own
 * `<html>`, delete this component and set lang in the locale layout.
 */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    const root = document.documentElement;
    if (root.lang !== locale) root.lang = locale;
    const dir = locale === "ar" ? "rtl" : "ltr";
    if (root.dir !== dir) root.dir = dir;
  }, [locale]);

  return null;
}
