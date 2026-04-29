"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatSize, getCompressionRate } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import { type VideoFileTask } from "@/lib/video-batch-engine";

interface VideoPreviewModalProps {
  task: VideoFileTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPreviewModal({
  task,
  open,
  onOpenChange,
}: VideoPreviewModalProps) {
  if (!task) return null;

  const compressionRate = task.result
    ? getCompressionRate(task.result.originalSize, task.result.resultSize)
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
              <h3 className="text-sm font-medium">原始</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {task.file.name.split(".").pop()?.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatSize(task.file.size)}
                </span>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted">
              {task.originalUrl && (
                <video
                  src={task.originalUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-[60vh]"
                />
              )}
            </div>
          </div>

          {/* Result */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">结果</h3>
              {task.result && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {task.resultBlob?.type?.split("/")[1]?.toUpperCase() || "?"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatSize(task.result.resultSize)}
                  </span>
                </div>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden bg-muted">
              {task.resultUrl && (
                <video
                  src={task.resultUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-[60vh]"
                />
              )}
            </div>
          </div>
        </div>

        {task.result && (
          <div className="flex justify-center gap-4 pt-2 text-sm">
            {task.duration !== undefined && (
              <span className="text-muted-foreground">
                {formatDuration(task.duration)}
              </span>
            )}
            <span
              className={
                compressionRate > 0
                  ? "font-medium text-success"
                  : "font-medium text-destructive"
              }
            >
              {compressionRate > 0 ? "节省" : "增加"}{" "}
              {formatSize(
                Math.abs(task.result.originalSize - task.result.resultSize)
              )}{" "}
              ({Math.abs(compressionRate)}%)
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
