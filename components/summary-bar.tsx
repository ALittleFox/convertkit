"use client";

import { File, HardDrive, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatSize } from "@/lib/utils";

interface SummaryBarProps {
  stats: {
    total: number;
    pending: number;
    processing: number;
    done: number;
    error: number;
    originalSize: number;
    resultSize: number;
  };
}

export function SummaryBar({ stats }: SummaryBarProps) {
  const t = useTranslations("summary");
  const tc = useTranslations("common");
  const savedSize = stats.originalSize - stats.resultSize;
  const savedPercent =
    stats.originalSize > 0
      ? Math.round((savedSize / stats.originalSize) * 100)
      : 0;

  const items = [
    {
      icon: File,
      label: t("files"),
      value: `${stats.done}/${stats.total}`,
      detail:
        stats.processing > 0
          ? `${stats.processing} ${t("processing")}`
          : stats.error > 0
          ? `${stats.error} ${t("failed")}`
          : undefined,
    },
    {
      icon: HardDrive,
      label: t("originalSize"),
      value: formatSize(stats.originalSize),
    },
    {
      icon: HardDrive,
      label: t("resultSize"),
      value: formatSize(stats.resultSize),
    },
    {
      icon: TrendingDown,
      label: savedSize >= 0 ? t("saved") : tc("increase"),
      value: stats.done > 0 ? `${formatSize(Math.abs(savedSize))} (${Math.abs(savedPercent)}%)` : "-",
      highlight: savedPercent > 0,
      warn: savedPercent < 0,
    },
  ];

  return (
    <Card>
      <CardContent className="py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.highlight && "text-success",
                    item.warn && "text-destructive"
                  )}
                >
                  {item.value}
                </p>
                {item.detail && (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
