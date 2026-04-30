"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { cn, formatSize, mimeToName, getCompressionRate } from "@/lib/utils";
import { type FileTask } from "@/lib/batch-engine";

interface FileCardProps {
  task: FileTask;
  onRemove: (taskId: string) => void;
  onPreview: (task: FileTask) => void;
  onDownload: (taskId: string) => void;
  type: "compress" | "convert";
}

export function FileCard({
  task,
  onRemove,
  onPreview,
  onDownload,
  type,
}: FileCardProps) {
  const tc = useTranslations("common");
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (task.originalUrl) {
      setThumbnail(task.originalUrl);
    }
    return () => {
      if (thumbnail && thumbnail !== task.originalUrl) {
        URL.revokeObjectURL(thumbnail);
      }
    };
  }, [task.originalUrl]);

  const statusIcon = {
    pending: null,
    processing: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    done: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const statusBadge = {
    pending: <Badge variant="secondary">{tc("pending")}</Badge>,
    processing: <Badge variant="default">{tc("processing")}</Badge>,
    done: <Badge variant="default" className="bg-success text-success-foreground hover:bg-success">{tc("done")}</Badge>,
    error: <Badge variant="destructive">{tc("error")}</Badge>,
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={task.file.name}
                className="w-full h-full object-cover"
              />
            )}
            {task.status === "processing" && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {mimeToName(task.file.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(task.file.size)}
                  </span>
                  {statusIcon[task.status]}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {statusBadge[task.status]}
              </div>
            </div>

            {task.status === "processing" && (
              <Progress value={task.progress} className="mt-2 h-1" />
            )}

            {task.status === "done" && task.result && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-medium">
                  {formatSize(task.result.resultSize)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    getCompressionRate(task.result.originalSize, task.result.resultSize) > 0
                      ? "text-success"
                      : "text-destructive"
                  )}
                >
                  {getCompressionRate(task.result.originalSize, task.result.resultSize) > 0
                    ? `-${getCompressionRate(task.result.originalSize, task.result.resultSize)}%`
                    : `+${Math.abs(getCompressionRate(task.result.originalSize, task.result.resultSize))}%`}
                </span>
              </div>
            )}

            {task.status === "error" && (
              <p className="text-xs text-destructive mt-1">{task.error}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {task.status === "done" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onPreview(task)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDownload(task.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(task.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
