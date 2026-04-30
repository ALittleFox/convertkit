"use client";

import { useState } from "react";
import { Music, Download, Trash2, Play, Film } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { FileCard } from "@/components/file-card";
import { AudioSettingsPanel } from "@/components/audio-settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { PreviewModal } from "@/components/preview-modal";
import { useBatchProcess } from "@/hooks/use-batch-process";
import { filterValidAudioFiles, getAudioOutputMime, getAudioDuration, isVideoFile } from "@/lib/audio-utils";
import { processAudioBatch, type AudioProcessOptions } from "@/lib/audio-batch-engine";
import { getFilenameWithoutExt } from "@/lib/file-utils";
import { formatSize } from "@/lib/utils";
import { formatDuration } from "@/lib/video-utils";
import type { AudioFileTask } from "@/lib/task-types";

export default function AudioPage() {
  const t = useTranslations("audio");
  const tc = useTranslations("common");
  const td = useTranslations("dropzone");

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
  } = useBatchProcess<AudioFileTask, AudioProcessOptions>({
    defaultOptions: { outputFormat: "mp3", bitrate: 192 },
    validator: { filterValid: filterValidAudioFiles },
    createTask: async (file, counter) => {
      let duration: number | undefined;
      try {
        duration = await getAudioDuration(file);
      } catch {
        // Duration detection failed
      }
      return {
        id: `atask-${counter}`,
        file,
        status: "pending" as const,
        progress: 0,
        originalUrl: URL.createObjectURL(file),
        duration,
      };
    },
    processBatch: processAudioBatch,
    createResultBlob: (task, result, options) => {
      const mime = getAudioOutputMime(options.outputFormat);
      const blob = new Blob([result.data], { type: mime });
      return { blob, url: URL.createObjectURL(blob) };
    },
    getOutputFilename: (task, options) => {
      const baseName = getFilenameWithoutExt(task.file.name);
      return `${baseName}.${options.outputFormat}`;
    },
    zipName: "audio.zip",
  });

  const [previewTask, setPreviewTask] = useState<AudioFileTask | null>(null);

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <DropZone
          onFilesAdded={addFiles}
          disabled={isProcessing}
          accept="audio/mpeg,audio/mp3,audio/aac,audio/ogg,audio/wav,audio/flac,audio/webm,audio/x-m4a,audio/mp4,video/mp4,video/webm,video/quicktime,video/x-msvideo"
          label={td("dragAudio")}
          mobileLabel={td("addAudio")}
          hint={td("audioHint")}
        />
        <div className="space-y-4">
          <AudioSettingsPanel options={options} onChange={setOptions} />
          {tasks.length > 0 && <SummaryBar stats={stats} />}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {tasks.length} {tc("files")}
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
                  isVideoFile(task.file) ? (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Music className="h-5 w-5 text-muted-foreground" />
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
          <audio
            src={url}
            controls
            preload="metadata"
            className="w-full"
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
