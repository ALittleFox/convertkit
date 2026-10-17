"use client";

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
import { cn, formatSize, getCompressionRate } from "@/lib/utils";
import type { BaseTask } from "@/lib/task-types";

interface FileCardProps<T extends BaseTask> {
  task: T;
  onRemove: (taskId: string) => void;
  onPreview: (task: T) => void;
  onDownload: (taskId: string) => void;
  thumbnail: React.ReactNode;
  metadata?: React.ReactNode;
}

const statusIcon = {
  pending: null,
  processing: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
};

export function FileCard<T extends BaseTask>({
  task,
  onRemove,
  onPreview,
  onDownload,
  thumbnail,
  metadata,
}: FileCardProps<T>) {
  const tc = useTranslations("common");
  // Worker failures surface either a raw message or a stable code.
  const te = useTranslations("errors");

  const statusBadge = {
    pending: <Badge variant="secondary">{tc("pending")}</Badge>,
    processing: <Badge variant="default">{tc("processing")}</Badge>,
    done: (
      <Badge
        variant="default"
        className="bg-success text-success-foreground hover:bg-success"
      >
        {tc("done")}
      </Badge>
    ),
    error: <Badge variant="destructive">{tc("error")}</Badge>,
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {thumbnail}
            {task.status === "processing" && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{task.file.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {metadata}
                  {statusIcon[task.status]}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {statusBadge[task.status]}
              </div>
            </div>

            {task.status === "processing" && (
              <div className="mt-2 space-y-1">
                <Progress value={task.progress} className="h-1" />
                {task.stage === "loading" && (
                  <p className="text-xs text-muted-foreground">
                    {tc("loadingEngine", { percent: task.progress })}
                  </p>
                )}
              </div>
            )}

            {task.status === "done" && task.result && (() => {
              const rate = getCompressionRate(task.file.size, task.result.resultSize);
              return (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs font-medium">
                    {formatSize(task.result.resultSize)}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      rate > 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {rate > 0 ? `-${rate}%` : `+${Math.abs(rate)}%`}
                  </span>
                </div>
              );
            })()}

            {task.status === "error" && (
              <p className="text-xs text-destructive mt-1">
                {task.error === "PROCESS_FAILED"
                  ? te("processFailed")
                  : task.error}
              </p>
            )}
          </div>

          {/* Actions */}
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
