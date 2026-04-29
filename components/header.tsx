"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Image, Shrink, ArrowRightLeft, Film, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/compress", label: "压缩", icon: Shrink },
  { href: "/convert", label: "转换", icon: ArrowRightLeft },
  { href: "/transcode", label: "转码", icon: Film },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-[0_1px_3px_-1px_oklch(0_0_0/0.06)] dark:shadow-[0_1px_3px_-1px_oklch(0_0_0/0.3)]">
      <div className="container flex h-14 items-center m-auto">
        <Link href="/" className="mr-6 flex items-center space-x-2.5 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Image className="h-4.5 w-4.5" />
          </div>
          <span className="font-bold tracking-tight text-foreground">ConvertKit</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "transition-colors",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-1">
          <Link href="/privacy">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Shield className="mr-2 h-4 w-4" />
              隐私
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
