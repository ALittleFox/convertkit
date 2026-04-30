"use client";

import {
  X,
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  Film,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { cn, formatSize, getCompressionRate } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import { isVideoFile } from "@/lib/audio-utils";
import { type AudioFileTask } from "@/lib/audio-batch-engine";

interface AudioFileCardProps {
  task: AudioFileTask;
  onRemove: (taskId: string) => void;
  onPreview: (task: AudioFileTask) => void;
  onDownload: (taskId: string) => void;
}

export function AudioFileCard({
  task,
  onRemove,
  onPreview,
  onDownload,
}: AudioFileCardProps) {
  const tc = useTranslations("common");
  const statusIcon = {
    pending: null,
    processing: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    done: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

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

  const isVideo = isVideoFile(task.file);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Icon */}
          <div className="relative w-14 h-14 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {isVideo ? (
              <Film className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Music className="h-5 w-5 text-muted-foreground" />
            )}
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
                  <span className="text-xs text-muted-foreground uppercase">
                    {task.file.name.split(".").pop()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(task.file.size)}
                  </span>
                  {task.duration !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(task.duration)}
                    </span>
                  )}
                  {statusIcon[task.status]}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {statusBadge[task.status]}
              </div>
            </div>

            {/* Progress bar */}
            {task.status === "processing" && (
              <Progress value={task.progress} className="mt-2 h-1" />
            )}

            {/* Result info */}
            {task.status === "done" && task.result && (() => {
              const rate = getCompressionRate(task.result.originalSize, task.result.resultSize);
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

            {/* Error */}
            {task.status === "error" && (
              <p className="text-xs text-destructive mt-1">{task.error}</p>
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
