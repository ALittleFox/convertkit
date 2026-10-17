"use client";

import { useState } from "react";
import { ArrowRightLeft, Download, Trash2, Play, Info, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { FileCard } from "@/components/file-card";
import { SettingsPanel } from "@/components/settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { PreviewModal } from "@/components/preview-modal";
import { useBatchProcess } from "@/hooks/use-batch-process";
import { filterValidFiles, getFilenameWithoutExt } from "@/lib/file-utils";
import { processBatch } from "@/lib/batch-engine";
import { formatSize, mimeToExt, mimeToName } from "@/lib/utils";
import type { FileTask } from "@/lib/task-types";
import type { ProcessOptions } from "@/lib/batch-engine";

export default function ConvertPage() {
  const t = useTranslations("convert");
  const tc = useTranslations("common");

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
  } = useBatchProcess<FileTask, ProcessOptions>({
    defaultOptions: { quality: 80, lossless: false, effort: 6, targetFormat: "webp" },
    validator: { filterValid: filterValidFiles },
    createTask: (file, counter) => ({
      id: `task-${counter}`,
      file,
      status: "pending",
      progress: 0,
      originalUrl: URL.createObjectURL(file),
    }),
    processBatch: (tasks, options, onProgress) =>
      processBatch(tasks, "convert", options, onProgress),
    createResultBlob: (task, result, options) => {
      const mime = options.targetFormat
        ? `image/${options.targetFormat}`
        : task.file.type;
      const blob = new Blob([result.data], { type: mime });
      return { blob, url: URL.createObjectURL(blob) };
    },
    getOutputFilename: (task, options) => {
      if (options.targetFormat) {
        const ext = options.targetFormat;
        const baseName = getFilenameWithoutExt(task.file.name);
        return `${baseName}.${ext}`;
      }
      return task.file.name;
    },
  });

  const [previewTask, setPreviewTask] = useState<FileTask | null>(null);

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <DropZone onFilesAdded={addFiles} disabled={isProcessing} />
        <div className="space-y-4">
          <SettingsPanel
            type="convert"
            options={options}
            onChange={setOptions}
          />
          {tasks.length > 0 && <SummaryBar stats={stats} />}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("pageIntro")}
          </p>
        </div>
        <div className="flex items-start gap-3 mt-3">
          <Shield className="h-5 w-5 mt-0.5 shrink-0 text-green-500" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("privacyNote")}
          </p>
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
                  task.originalUrl ? (
                    <img
                      src={task.originalUrl}
                      alt={task.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : null
                }
                metadata={
                  <>
                    <span className="text-xs text-muted-foreground">
                      {mimeToName(task.file.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(task.file.size)}
                    </span>
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
          <img
            src={url}
            alt=""
            className="max-w-full max-h-[60vh] object-contain"
          />
        )}
        originalFormat={
          previewTask ? mimeToName(previewTask.file.type) : ""
        }
        resultFormat={
          previewTask?.resultBlob
            ? mimeToName(previewTask.resultBlob.type)
            : undefined
        }
        renderStats={(task) => {
          const result = task.result as
            | { width?: number; height?: number }
            | undefined;
          if (result?.width == null || result.height == null) return null;
          return (
            <span className="text-muted-foreground">
              {result.width} x {result.height}
            </span>
          );
        }}
      />
    </div>
  );
}
