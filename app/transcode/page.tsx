"use client";

import { useState, useEffect } from "react";
import { Film, Download, Trash2, Play, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { VideoFileCard } from "@/components/video-file-card";
import { VideoSettingsPanel } from "@/components/video-settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { VideoPreviewModal } from "@/components/video-preview-modal";
import { useVideoBatchProcess } from "@/hooks/use-video-batch-process";
import { type VideoFileTask } from "@/lib/video-batch-engine";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      ) ||
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
  } = useVideoBatchProcess();

  const [previewTask, setPreviewTask] = useState<VideoFileTask | null>(null);

  const handlePreview = (task: VideoFileTask) => {
    setPreviewTask(task);
  };

  if (isMobile) {
    return (
      <div className="container py-20 px-4 sm:px-6 m-auto">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="rounded-2xl p-4 mb-6 bg-muted text-muted-foreground">
            <Monitor className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t("mobileNotice")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("mobileNoticeDesc")}
          </p>
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
              <VideoFileCard
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

      <VideoPreviewModal
        task={previewTask}
        open={!!previewTask}
        onOpenChange={(open) => {
          if (!open) setPreviewTask(null);
        }}
      />
    </div>
  );
}
