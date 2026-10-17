import type { BaseTask, BaseTaskResult } from "./task-types";

export interface WorkerBatchEngine<T extends BaseTask, O> {
  processBatch(
    tasks: T[],
    options: O,
    onProgress: (
      taskId: string,
      status: T["status"],
      result?: BaseTaskResult,
      error?: string,
      progress?: number
    ) => void
  ): Promise<void>;
  terminate(): void;
}

export function createWorkerBatchEngine<T extends BaseTask, O>(
  workerFactory: () => Worker,
  buildMessage: (
    task: T,
    buffer: ArrayBuffer,
    options: O
  ) => { data: Record<string, unknown>; transfers?: ArrayBuffer[] }
): WorkerBatchEngine<T, O> {
  let worker: Worker | null = null;

  function getWorker(): Worker {
    if (!worker) {
      worker = workerFactory();
    }
    return worker;
  }

  async function processBatch(
    tasks: T[],
    options: O,
    onProgress: (
      taskId: string,
      status: T["status"],
      result?: BaseTaskResult,
      error?: string,
      progress?: number
    ) => void
  ): Promise<void> {
    const w = getWorker();

    for (const task of tasks) {
      onProgress(task.id, "processing", undefined, undefined, 0);

      try {
        const buffer = await task.file.arrayBuffer();
        const msg = buildMessage(task, buffer, options);

        const result = await new Promise<BaseTaskResult>((resolve, reject) => {
          const handler = (e: MessageEvent) => {
            if (e.data.id !== task.id) return;

            if (e.data.type === "progress") {
              onProgress(task.id, "processing", undefined, undefined, e.data.progress);
            } else if (e.data.type === "result") {
              w.removeEventListener("message", handler);
              resolve({
                data: e.data.data,
                originalSize: e.data.originalSize,
                resultSize: e.data.resultSize,
              });
            } else if (e.data.type === "error") {
              w.removeEventListener("message", handler);
              reject(new Error(e.data.error));
            }
          };

          w.addEventListener("message", handler);
          w.postMessage(msg.data, msg.transfers ? [msg.transfers[0]] : []);
        });

        onProgress(task.id, "done", result);
      } catch (err) {
        onProgress(
          task.id,
          "error",
          undefined,
          err instanceof Error ? err.message : "处理失败"
        );
      }
    }
  }

  function terminate() {
    worker?.terminate();
    worker = null;
  }

  return { processBatch, terminate };
}
