"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { formatSize, mimeToName } from "@/lib/utils";
import { type FileTask } from "@/lib/batch-engine";

interface PreviewModalProps {
  task: FileTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewModal({ task, open, onOpenChange }: PreviewModalProps) {
  const tc = useTranslations("common");
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] sm:!max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.file.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{tc("original")}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{mimeToName(task.file.type)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatSize(task.file.size)}
                </span>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
              {task.originalUrl && (
                <img
                  src={task.originalUrl}
                  alt="Original"
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{tc("result")}</h3>
              {task.result && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {mimeToName(task.resultBlob?.type || task.file.type)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatSize(task.result.resultSize)}
                  </span>
                </div>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
              {task.resultUrl && (
                <img
                  src={task.resultUrl}
                  alt="Result"
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>

        {task.result && (
          <div className="flex justify-center gap-4 pt-2 text-sm">
            <span className="text-muted-foreground">
              {task.result.width} × {task.result.height}
            </span>
            <span className="font-medium text-success">
              {tc("saved")} {formatSize(task.result.originalSize - task.result.resultSize)} (
              {Math.round(
                ((task.result.originalSize - task.result.resultSize) /
                  task.result.originalSize) *
                  100
              )}
              %)
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
