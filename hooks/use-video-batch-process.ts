"use client";

import { useState, useCallback, useRef } from "react";
import {
  type VideoFileTask,
  type VideoProcessOptions,
  processVideoBatch,
  terminateVideoWorker,
} from "@/lib/video-batch-engine";
import { downloadAsZip, downloadSingle } from "@/lib/zip-stream";
import {
  filterValidVideoFiles,
  getVideoOutputMime,
  generateVideoThumbnail,
} from "@/lib/video-utils";
import { getFilenameWithoutExt } from "@/lib/file-utils";
import { toast } from "sonner";

export function useVideoBatchProcess() {
  const [tasks, setTasks] = useState<VideoFileTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<VideoProcessOptions>({
    outputFormat: "mp4",
    videoCodec: "h264",
    crf: 23,
    removeAudio: false,
  });
  const taskIdCounter = useRef(0);

  const addFiles = useCallback(async (files: File[]) => {
    const { valid, invalid } = filterValidVideoFiles(files);

    if (invalid.length > 0) {
      toast.error(`${invalid.length} 个文件被跳过`, {
        description: invalid.map((i) => `${i.file.name}: ${i.error}`).join("\n"),
      });
    }

    // Generate thumbnails in parallel
    const newTasks: VideoFileTask[] = await Promise.all(
      valid.map(async (file) => {
        let thumbnail: string | undefined;
        try {
          thumbnail = await generateVideoThumbnail(file);
        } catch {
          // Thumbnail generation failed, continue without it
        }
        return {
          id: `vtask-${++taskIdCounter.current}`,
          file,
          status: "pending" as const,
          progress: 0,
          originalUrl: URL.createObjectURL(file),
          thumbnail,
        };
      })
    );

    setTasks((prev) => [...prev, ...newTasks]);

    if (valid.length > 0) {
      toast.success(`已添加 ${valid.length} 个视频`);
    }
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task?.originalUrl) URL.revokeObjectURL(task.originalUrl);
      if (task?.resultUrl) URL.revokeObjectURL(task.resultUrl);
      return prev.filter((t) => t.id !== taskId);
    });
  }, []);

  const clearTasks = useCallback(() => {
    setTasks((prev) => {
      prev.forEach((task) => {
        if (task.originalUrl) URL.revokeObjectURL(task.originalUrl);
        if (task.resultUrl) URL.revokeObjectURL(task.resultUrl);
      });
      return [];
    });
  }, []);

  const updateTask = useCallback(
    (taskId: string, updates: Partial<VideoFileTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const startProcess = useCallback(async () => {
    setTasks((prev) => {
      const pendingTasks = prev.filter((t) => t.status === "pending");
      if (pendingTasks.length === 0) {
        toast.warning("没有待处理的视频");
        return prev;
      }
      return prev;
    });

    // Get current tasks snapshot
    const currentTasks = tasks.filter((t) => t.status === "pending");
    if (currentTasks.length === 0) {
      toast.warning("没有待处理的视频");
      return;
    }

    setIsProcessing(true);

    await processVideoBatch(
      currentTasks,
      options,
      (taskId, status, result, error, progress) => {
        if (status === "done" && result) {
          const mime = getVideoOutputMime(options.outputFormat);
          const blob = new Blob([result.data], { type: mime });
          const resultUrl = URL.createObjectURL(blob);

          updateTask(taskId, {
            status: "done",
            result,
            resultBlob: blob,
            resultUrl,
            progress: 100,
          });
        } else if (status === "error") {
          updateTask(taskId, { status: "error", error });
        } else if (status === "processing" && progress !== undefined) {
          updateTask(taskId, { status: "processing", progress });
        }
      }
    );

    setIsProcessing(false);
    toast.success("转码完成");
  }, [tasks, options, updateTask]);

  const downloadResult = useCallback(
    async (taskId: string) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task?.resultBlob) return prev;

        const baseName = getFilenameWithoutExt(task.file.name);
        const ext = options.outputFormat;
        const filename = `${baseName}.${ext}`;

        task.resultBlob.arrayBuffer().then((buffer) => {
          downloadSingle(buffer, filename, task.resultBlob!.type);
        });

        return prev;
      });
    },
    [options.outputFormat]
  );

  const downloadAll = useCallback(async () => {
    const completedTasks = tasks.filter((t) => t.status === "done" && t.resultBlob);

    if (completedTasks.length === 0) {
      toast.warning("没有可下载的文件");
      return;
    }

    const files = await Promise.all(
      completedTasks.map(async (task) => {
        const baseName = getFilenameWithoutExt(task.file.name);
        const ext = options.outputFormat;
        return {
          name: `${baseName}.${ext}`,
          data: await task.resultBlob!.arrayBuffer(),
        };
      })
    );

    await downloadAsZip(files, "videos.zip");
    toast.success("ZIP 下载完成");
  }, [tasks, options.outputFormat]);

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    processing: tasks.filter((t) => t.status === "processing").length,
    done: tasks.filter((t) => t.status === "done").length,
    error: tasks.filter((t) => t.status === "error").length,
    originalSize: tasks.reduce((sum, t) => sum + t.file.size, 0),
    resultSize: tasks.reduce((sum, t) => sum + (t.result?.resultSize || 0), 0),
  };

  return {
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
  };
}
