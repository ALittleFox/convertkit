"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={
        theme === "light"
          ? "切换到深色模式"
          : theme === "dark"
          ? "跟随系统"
          : "切换到浅色模式"
      }
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
