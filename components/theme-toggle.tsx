"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

// Nothing to subscribe to — this only distinguishes server render from client.
function subscribeNoop() {
  return () => {};
}

/**
 * True only after hydration. Used to avoid rendering theme-dependent UI during
 * SSR (the server cannot know the stored theme). `useSyncExternalStore` keeps
 * the server snapshot stable without a setState-in-effect cascade.
 */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useTranslations("theme");

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <Monitor className="h-[1.15rem] w-[1.15rem]" />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const label =
    theme === "light"
      ? t("light")
      : theme === "dark"
      ? t("dark")
      : t("system");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
      title={label}
    >
      <span className="relative inline-flex h-[1.15rem] w-[1.15rem]">
        <Sun
          className="absolute inset-0 transition-all duration-300 ease-out"
          style={{
            opacity: theme === "light" ? 1 : 0,
            transform:
              theme === "light"
                ? "rotate(0deg) scale(1)"
                : "rotate(90deg) scale(0.5)",
          }}
        />
        <Moon
          className="absolute inset-0 transition-all duration-300 ease-out"
          style={{
            opacity: theme === "dark" ? 1 : 0,
            transform:
              theme === "dark"
                ? "rotate(0deg) scale(1)"
                : "rotate(-90deg) scale(0.5)",
          }}
        />
        <Monitor
          className="absolute inset-0 transition-all duration-300 ease-out"
          style={{
            opacity: theme === "system" ? 1 : 0,
            transform:
              theme === "system"
                ? "rotate(0deg) scale(1)"
                : "rotate(90deg) scale(0.5)",
          }}
        />
      </span>
    </Button>
  );
}
