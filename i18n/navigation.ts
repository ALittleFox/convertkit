/**
 * Locale-aware navigation.
 *
 * `Link`, `redirect`, `usePathname` and `useRouter` from here automatically
 * carry the current locale prefix, so components never have to build
 * `/${locale}/...` strings by hand.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
