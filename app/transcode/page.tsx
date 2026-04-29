"use client";

import { useState } from "react";
import { Film, Download, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/drop-zone";
import { VideoFileCard } from "@/components/video-file-card";
import { VideoSettingsPanel } from "@/components/video-settings-panel";
import { SummaryBar } from "@/components/summary-bar";
import { VideoPreviewModal } from "@/components/video-preview-modal";
import { useVideoBatchProcess } from "@/hooks/use-video-batch-process";
import { type VideoFileTask } from "@/lib/video-batch-engine";

export default function TranscodePage() {
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

  return (
    <div className="container py-6 px-4 sm:px-6 space-y-6 m-auto">
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5" />
        <h1 className="text-2xl font-bold">视频转码</h1>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <DropZone
          onFilesAdded={addFiles}
          disabled={isProcessing}
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          label="拖拽视频到此处"
          mobileLabel="添加视频到此处"
          hint="或点击选择文件 · 支持 MP4, WebM, MOV, AVI · 最大 500MB"
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
              {tasks.length} 个视频
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
                {isProcessing ? "转码中..." : "开始转码"}
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
