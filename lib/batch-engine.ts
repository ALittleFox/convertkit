import { getPool, type WorkerResult } from "./worker-manager";
import type { FileTask } from "./task-types";

export type { FileTask };

export interface ProcessOptions {
  quality?: number;
  lossless?: boolean;
  effort?: number;
  targetFormat?: string;
}

export async function processFile(
  file: File,
  type: "compress" | "convert",
  options: ProcessOptions
): Promise<WorkerResult> {
  const pool = getPool();
  const buffer = await file.arrayBuffer();
  return pool.process(buffer, type, options);
}

export async function processBatch(
  tasks: FileTask[],
  type: "compress" | "convert",
  options: ProcessOptions,
  onProgress: (taskId: string, status: FileTask["status"], result?: WorkerResult, error?: string) => void
): Promise<void> {
  const pool = getPool();

  const processTask = async (task: FileTask) => {
    onProgress(task.id, "processing");

    try {
      const buffer = await task.file.arrayBuffer();
      const result = await pool.process(buffer, type, options);

      onProgress(task.id, "done", result);
    } catch (err) {
      onProgress(task.id, "error", undefined, err instanceof Error ? err.message : "PROCESS_FAILED");
    }
  };

  const concurrency = pool["maxWorkers"] || 4;
  const queue = [...tasks];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        await processTask(task);
      }
    }
  });

  await Promise.all(workers);
}

export function getPoolSize(): number {
  return getPool()["maxWorkers"] || 4;
}
