"use client";

import { useState } from "react";
import { ArrowRightLeft, Download, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { FileCard } from "@/components/file-card";
import { SettingsPanel } from "@/components/settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { PreviewModal } from "@/components/preview-modal";
import { useBatchProcess } from "@/hooks/use-batch-process";
import { type FileTask } from "@/lib/batch-engine";

export default function ConvertPage() {
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
  } = useBatchProcess("convert");

  const [previewTask, setPreviewTask] = useState<FileTask | null>(null);

  const handlePreview = (task: FileTask) => {
    setPreviewTask(task);
  };

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5" />
        <h1 className="text-2xl font-bold">批量格式转换</h1>
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

      {tasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {tasks.length} 个文件
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearTasks}
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAll}
                disabled={stats.done === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                下载全部
              </Button>
              <Button
                size="sm"
                onClick={() => startProcess()}
                disabled={isProcessing || stats.pending === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                {isProcessing ? "处理中..." : "开始转换"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <FileCard
                key={task.id}
                task={task}
                onRemove={removeTask}
                onPreview={handlePreview}
                onDownload={downloadResult}
                type="convert"
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
      />
    </div>
  );
}
