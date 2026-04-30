"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { formatSize, getCompressionRate } from "@/lib/utils";
import type { BaseTask } from "@/lib/task-types";

interface PreviewModalProps<T extends BaseTask> {
  task: T | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renderMedia: (url: string) => React.ReactNode;
  originalFormat: string;
  resultFormat?: string;
  renderStats?: (task: T) => React.ReactNode;
}

export function PreviewModal<T extends BaseTask>({
  task,
  open,
  onOpenChange,
  renderMedia,
  originalFormat,
  resultFormat,
  renderStats,
}: PreviewModalProps<T>) {
  const tc = useTranslations("common");
  if (!task) return null;

  const compressionRate = task.result
    ? getCompressionRate(task.file.size, task.result.resultSize)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] sm:!max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.file.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{tc("original")}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{originalFormat}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatSize(task.file.size)}
                </span>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px]">
              {task.originalUrl && renderMedia(task.originalUrl)}
            </div>
          </div>

          {/* Result */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{tc("result")}</h3>
              {task.result && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{resultFormat || "?"}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatSize(task.result.resultSize)}
                  </span>
                </div>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px]">
              {task.resultUrl && renderMedia(task.resultUrl)}
            </div>
          </div>
        </div>

        {task.result && (
          <div className="flex justify-center gap-4 pt-2 text-sm">
            {renderStats?.(task)}
            <span
              className={
                compressionRate > 0
                  ? "font-medium text-success"
                  : "font-medium text-destructive"
              }
            >
              {compressionRate > 0 ? tc("saved") : tc("increase")}{" "}
              {formatSize(Math.abs(task.file.size - task.result.resultSize))}{" "}
              ({Math.abs(compressionRate)}%)
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
