"use client";

import { useState } from "react";
import { Music, Download, Trash2, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { AudioFileCard } from "@/components/audio-file-card";
import { AudioSettingsPanel } from "@/components/audio-settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { AudioPreviewModal } from "@/components/audio-preview-modal";
import { useAudioBatchProcess } from "@/hooks/use-audio-batch-process";
import { type AudioFileTask } from "@/lib/audio-batch-engine";

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
  } = useAudioBatchProcess();

  const [previewTask, setPreviewTask] = useState<AudioFileTask | null>(null);

  const handlePreview = (task: AudioFileTask) => {
    setPreviewTask(task);
  };

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
              <AudioFileCard
                key={task.id}
                task={task}
                onRemove={removeTask}
                onPreview={handlePreview}
                onDownload={downloadResult}
              />
            ))}
          </div>
        </div>
      )}

      <AudioPreviewModal
        task={previewTask}
        open={!!previewTask}
        onOpenChange={(open) => {
          if (!open) setPreviewTask(null);
        }}
      />
    </div>
  );
}
