"use client";

import { File, HardDrive, TrendingDown, Loader2 } from "lucide-react";
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
  const savedSize = stats.originalSize - stats.resultSize;
  const savedPercent =
    stats.originalSize > 0
      ? Math.round((savedSize / stats.originalSize) * 100)
      : 0;

  const items = [
    {
      icon: File,
      label: "文件",
      value: `${stats.done}/${stats.total}`,
      detail:
        stats.processing > 0
          ? `${stats.processing} 处理中`
          : stats.error > 0
          ? `${stats.error} 失败`
          : undefined,
    },
    {
      icon: HardDrive,
      label: "原始大小",
      value: formatSize(stats.originalSize),
    },
    {
      icon: HardDrive,
      label: "结果大小",
      value: formatSize(stats.resultSize),
    },
    {
      icon: TrendingDown,
      label: "节省",
      value: stats.done > 0 ? `${formatSize(savedSize)} (${savedPercent}%)` : "-",
      highlight: savedPercent > 0,
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
                    item.highlight && "text-success"
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
