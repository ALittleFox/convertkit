"use client";

import { useState, useEffect } from "react";
import { Film, Download, Trash2, Play, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { FileCard } from "@/components/file-card";
import { VideoSettingsPanel } from "@/components/video-settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { PreviewModal } from "@/components/preview-modal";
import { useBatchProcess } from "@/hooks/use-batch-process";
import { filterValidVideoFiles, getVideoOutputMime, generateVideoThumbnail } from "@/lib/video-utils";
import { processVideoBatch, type VideoProcessOptions } from "@/lib/video-batch-engine";
import { getFilenameWithoutExt } from "@/lib/file-utils";
import { formatSize } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import type { VideoFileTask } from "@/lib/task-types";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 1);
    setIsMobile(mobile);
  }, []);

  return isMobile;
}

export default function TranscodePage() {
  const t = useTranslations("transcode");
  const tc = useTranslations("common");
  const td = useTranslations("dropzone");
  const isMobile = useIsMobile();

  const {
    tasks,
    options,
    setOptions,
    addFiles,
    removeTask,
    clearTasks,
    startProcess,
    downloadResult,
    downloadAll,
    isProcessing,
    stats,
  } = useBatchProcess<VideoFileTask, VideoProcessOptions>({
    defaultOptions: { outputFormat: "mp4", videoCodec: "h264", crf: 23, removeAudio: false },
    validator: { filterValid: filterValidVideoFiles },
    createTask: async (file, counter) => {
      let thumbnail: string | undefined;
      try {
        thumbnail = await generateVideoThumbnail(file);
      } catch {
        // Thumbnail generation failed
      }
      return {
        id: `vtask-${counter}`,
        file,
        status: "pending" as const,
        progress: 0,
        originalUrl: URL.createObjectURL(file),
        thumbnail,
      };
    },
    processBatch: processVideoBatch,
    createResultBlob: (task, result, options) => {
      const mime = getVideoOutputMime(options.outputFormat);
      const blob = new Blob([result.data], { type: mime });
      return { blob, url: URL.createObjectURL(blob) };
    },
    getOutputFilename: (task, options) => {
      const baseName = getFilenameWithoutExt(task.file.name);
      return `${baseName}.${options.outputFormat}`;
    },
    zipName: "videos.zip",
  });

  const [previewTask, setPreviewTask] = useState<VideoFileTask | null>(null);

  if (isMobile) {
    return (
      <div className="container py-20 px-4 sm:px-6 m-auto">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="rounded-2xl p-4 mb-6 bg-muted text-muted-foreground">
            <Monitor className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t("mobileNotice")}</h2>
          <p className="text-muted-foreground text-sm">{t("mobileNoticeDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <DropZone
          onFilesAdded={addFiles}
          disabled={isProcessing}
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          label={td("dragVideo")}
          mobileLabel={td("addVideo")}
          hint={td("videoHint")}
        />
        <div className="space-y-4">
          <VideoSettingsPanel options={options} onChange={setOptions} />
          {tasks.length > 0 && <SummaryBar stats={stats} />}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {tasks.length} {tc("videos")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearTasks}
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc("clear")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAll}
                disabled={stats.done === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                {tc("downloadAll")}
              </Button>
              <Button
                size="sm"
                onClick={() => startProcess()}
                disabled={isProcessing || stats.pending === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                {isProcessing ? t("processing") : t("start")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <FileCard
                key={task.id}
                task={task}
                onRemove={removeTask}
                onPreview={setPreviewTask}
                onDownload={downloadResult}
                thumbnail={
                  task.thumbnail ? (
                    <img
                      src={task.thumbnail}
                      alt={task.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  )
                }
                metadata={
                  <>
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
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      <PreviewModal
        task={previewTask}
        open={!!previewTask}
        onOpenChange={(open) => {
          if (!open) setPreviewTask(null);
        }}
        renderMedia={(url) => (
          <video
            src={url}
            controls
            preload="metadata"
            className="w-full max-h-[60vh]"
          />
        )}
        originalFormat={
          previewTask?.file.name.split(".").pop()?.toUpperCase() || ""
        }
        resultFormat={
          previewTask?.resultBlob?.type
            ?.split("/")[1]
            ?.toUpperCase() || undefined
        }
        renderStats={(task) =>
          task.duration !== undefined ? (
            <span className="text-muted-foreground">
              {formatDuration(task.duration)}
            </span>
          ) : null
        }
      />
    </div>
  );
}
