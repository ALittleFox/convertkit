"use client";

import { useState, useCallback, useRef } from "react";
import { type FileTask, type ProcessOptions, processBatch } from "@/lib/batch-engine";
import { downloadAsZip, downloadSingle } from "@/lib/zip-stream";
import {  mimeToExt } from "@/lib/utils";
import { filterValidFiles, getFilenameWithoutExt } from "@/lib/file-utils";
import { toast } from "sonner";

export function useBatchProcess(type: "compress" | "convert") {
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<ProcessOptions>({
    quality: 80,
    lossless: false,
    effort: 6,
    targetFormat: type === "convert" ? "webp" : undefined,
  });
  const taskIdCounter = useRef(0);

  const addFiles = useCallback((files: File[]) => {
    const { valid, invalid } = filterValidFiles(files);

    if (invalid.length > 0) {
      toast.error(`${invalid.length} 个文件被跳过`, {
        description: invalid.map((i) => `${i.file.name}: ${i.error}`).join("\n"),
      });
    }

    const newTasks: FileTask[] = valid.map((file) => ({
      id: `task-${++taskIdCounter.current}`,
      file,
      status: "pending",
      progress: 0,
      originalUrl: URL.createObjectURL(file),
    }));

    setTasks((prev) => [...prev, ...newTasks]);

    if (valid.length > 0) {
      toast.success(`已添加 ${valid.length} 个文件`);
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
    tasks.forEach((task) => {
      if (task.originalUrl) URL.revokeObjectURL(task.originalUrl);
      if (task.resultUrl) URL.revokeObjectURL(task.resultUrl);
    });
    setTasks([]);
  }, [tasks]);

  const updateTask = useCallback(
    (taskId: string, updates: Partial<FileTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const startProcess = useCallback(
    async (processOptions?: ProcessOptions) => {
      const opts = processOptions || options;
      const pendingTasks = tasks.filter((t) => t.status === "pending");

      if (pendingTasks.length === 0) {
        toast.warning("没有待处理的文件");
        return;
      }

      setIsProcessing(true);

      await processBatch(pendingTasks, type, opts, (taskId, status, result, error) => {
        if (status === "done" && result) {
          const task = tasks.find((t) => t.id === taskId);
          const mime =
            type === "convert" && opts.targetFormat
              ? `image/${opts.targetFormat}`
              : task?.file.type || "image/jpeg";

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
        } else {
          updateTask(taskId, { status });
        }
      });

      setIsProcessing(false);
      toast.success("处理完成");
    },
    [tasks, type, options, updateTask]
  );

  const downloadResult = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.resultBlob) return;

      const ext = mimeToExt(task.resultBlob.type);
      const baseName = getFilenameWithoutExt(task.file.name);
      const filename = type === "convert" ? `${baseName}.${ext}` : task.file.name;

      const buffer = await task.resultBlob.arrayBuffer();
      downloadSingle(buffer, filename, task.resultBlob.type);
    },
    [tasks, type]
  );

  const downloadAll = useCallback(async () => {
    const completedTasks = tasks.filter((t) => t.status === "done" && t.resultBlob);

    if (completedTasks.length === 0) {
      toast.warning("没有可下载的文件");
      return;
    }

    const files = await Promise.all(
      completedTasks.map(async (task) => {
        const ext = mimeToExt(task.resultBlob!.type);
        const baseName = getFilenameWithoutExt(task.file.name);
        const filename = type === "convert" ? `${baseName}.${ext}` : task.file.name;

        return {
          name: filename,
          data: await task.resultBlob!.arrayBuffer(),
        };
      })
    );

    await downloadAsZip(files);
    toast.success("ZIP 下载完成");
  }, [tasks, type]);

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
