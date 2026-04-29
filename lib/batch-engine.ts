import { getPool, type WorkerResult } from "./worker-manager";

export interface ProcessOptions {
  quality?: number;
  lossless?: boolean;
  effort?: number;
  targetFormat?: string;
}

export interface FileTask {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  result?: WorkerResult;
  resultBlob?: Blob;
  error?: string;
  originalUrl?: string;
  resultUrl?: string;
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

      const mime = type === "convert" && options.targetFormat
        ? `image/${options.targetFormat}`
        : task.file.type;

      const blob = new Blob([result.data], { type: mime });
      onProgress(task.id, "done", result);
    } catch (err) {
      onProgress(task.id, "error", undefined, err instanceof Error ? err.message : "处理失败");
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
