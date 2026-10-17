"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { downloadAsZip, downloadSingle } from "@/lib/zip-stream";
import type { BaseTask, BaseTaskResult } from "@/lib/task-types";
import type { ValidationError } from "@/lib/file-utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export interface Stats {
  total: number;
  pending: number;
  processing: number;
  done: number;
  error: number;
  originalSize: number;
  resultSize: number;
}

export interface UseBatchProcessConfig<T extends BaseTask, O> {
  defaultOptions: O;
  validator: {
    filterValid(files: File[]): {
      valid: File[];
      invalid: { file: File; error: ValidationError }[];
    };
  };
  createTask: (file: File, counter: number) => T | Promise<T>;
  processBatch: (
    tasks: T[],
    options: O,
    onProgress: (
      taskId: string,
      status: T["status"],
      result?: BaseTaskResult,
      error?: string,
      progress?: number
    ) => void
  ) => Promise<void>;
  createResultBlob: (task: T, result: BaseTaskResult, options: O) => { blob: Blob; url: string };
  getOutputFilename: (task: T, options: O) => string;
  zipName?: string;
}

export function useBatchProcess<T extends BaseTask, O>(
  config: UseBatchProcessConfig<T, O>
) {
  const t = useTranslations("errors");
  // Localise a structured validation error ({code, ...params}).
  const formatValidation = useCallback(
    (error: ValidationError): string =>
      error.code === "unsupportedFormat"
        ? t("unsupportedFormat", { type: error.type || t("unknown") })
        : t("fileTooLarge", { size: error.size, max: error.max }),
    [t]
  );
  const [tasks, setTasks] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<O>(config.defaultOptions);
  const [autoProcess, setAutoProcess] = useState(true);
  const taskIdCounter = useRef(0);
  // Refs mirror the latest state so the long-running `processBatch` callback
  // (created once) always reads current values instead of a stale closure.
  // They are synced in effects — writing them during render is a side effect
  // React explicitly disallows (react-hooks/refs).
  const tasksRef = useRef<T[]>([]);
  const optionsRef = useRef<O>(options);
  const autoProcessRef = useRef(autoProcess);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    autoProcessRef.current = autoProcess;
  }, [autoProcess]);

  const updateTask = useCallback(
    (taskId: string, updates: Partial<T>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const processTaskList = useCallback(
    async (tasksToProcess: T[]) => {
      if (tasksToProcess.length === 0) return;

      setIsProcessing(true);
      let errorCount = 0;

      await config.processBatch(
        tasksToProcess,
        optionsRef.current,
        (taskId, status, result, error, progress) => {
          const task = tasksRef.current.find((t) => t.id === taskId);
          if (status === "done" && result && task) {
            const { blob, url } = config.createResultBlob(task, result, optionsRef.current);
            updateTask(taskId, {
              status: "done",
              result,
              resultBlob: blob,
              resultUrl: url,
              progress: 100,
            } as Partial<T>);
          } else if (status === "error") {
            errorCount++;
            updateTask(taskId, { status: "error", error } as Partial<T>);
            toast.error(
              t("toastProcessFailed", {
                name: task?.file.name || t("file"),
              }),
              { description: error }
            );
          } else if (status === "processing" && progress !== undefined) {
            updateTask(taskId, {
              status: "processing",
              progress,
            } as Partial<T>);
          }
        }
      );

      setIsProcessing(false);
      if (errorCount === 0) {
        toast.success(t("toastProcessDone"));
      } else if (errorCount < tasksToProcess.length) {
        toast.warning(
          t("toastProcessPartial", {
            ok: tasksToProcess.length - errorCount,
            failed: errorCount,
          })
        );
      }
    },
    [config, updateTask, t]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const { valid, invalid } = config.validator.filterValid(files);

      if (invalid.length > 0) {
        toast.error(
          t("toastFilesSkipped", { count: invalid.length }),
          {
            description: invalid
              .map((i) => `${i.file.name}: ${formatValidation(i.error)}`)
              .join("\n"),
          }
        );
      }

      if (valid.length === 0) return;

      const newTasks = await Promise.all(
        valid.map((file) => config.createTask(file, ++taskIdCounter.current))
      );

      setTasks((prev) => [...prev, ...newTasks]);

      if (autoProcessRef.current) {
        toast.success(
          t("toastFilesAddedProcessing", { count: valid.length })
        );
        processTaskList(newTasks);
      } else {
        toast.success(t("toastFilesAdded", { count: valid.length }));
      }
    },
    [config, processTaskList, t, formatValidation]
  );

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

  const startProcess = useCallback(async () => {
    const pendingTasks = tasksRef.current.filter((t) => t.status === "pending");
    if (pendingTasks.length === 0) {
      toast.warning(t("toastNoPending"));
      return;
    }

    await processTaskList(pendingTasks);
  }, [processTaskList, t]);

  const downloadResult = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.resultBlob) return;

      const filename = config.getOutputFilename(task, options);
      const buffer = await task.resultBlob.arrayBuffer();
      downloadSingle(buffer, filename, task.resultBlob.type);
    },
    [tasks, options, config]
  );

  const downloadAll = useCallback(async () => {
    const completedTasks = tasks.filter(
      (t) => t.status === "done" && t.resultBlob
    );

    if (completedTasks.length === 0) {
      toast.warning(t("toastNothingToDownload"));
      return;
    }

    const files = await Promise.all(
      completedTasks.map(async (task) => ({
        name: config.getOutputFilename(task, options),
        data: await task.resultBlob!.arrayBuffer(),
      }))
    );

    await downloadAsZip(files, config.zipName ?? "files.zip");
    toast.success(t("toastZipDone"));
  }, [tasks, options, config, t]);

  const stats: Stats = {
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
    autoProcess,
    setAutoProcess,
    stats,
  };
}
