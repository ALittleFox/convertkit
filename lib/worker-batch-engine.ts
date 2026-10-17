import type { BaseTask, BaseTaskResult } from "./task-types";
import type { Transport, TransportMessage } from "./worker-transport";

/** Callback shape shared by every batch engine and the useBatchProcess hook. */
export type ProgressReporter<T extends BaseTask> = (
  taskId: string,
  status: T["status"],
  result?: BaseTaskResult,
  error?: string,
  progress?: number
) => void;

export interface WorkerBatchEngine<T extends BaseTask, O> {
  processBatch(tasks: T[], options: O, onProgress: ProgressReporter<T>): Promise<void>;
  /** How many tasks may run concurrently (pool size). */
  readonly concurrency: number;
  terminate(): void;
}

/**
 * Generic batch engine: iterates tasks and runs each through a Transport.
 *
 * Concurrency comes from the transport, so the same loop serves both the
 * multi-worker image pool and the single-worker FFmpeg engines.
 */
export function createWorkerBatchEngine<T extends BaseTask, O>(
  transport: Transport,
  buildMessage: (task: T, buffer: ArrayBuffer, options: O) => TransportMessage
): WorkerBatchEngine<T, O> {
  async function runTask(task: T, options: O, onProgress: ProgressReporter<T>) {
    onProgress(task.id, "processing", undefined, undefined, 0);

    try {
      const buffer = await task.file.arrayBuffer();
      const message = buildMessage(task, buffer, options);

      const result = await transport.run(message, {
        onProgress: (progress) =>
          onProgress(task.id, "processing", undefined, undefined, progress),
      });

      onProgress(task.id, "done", {
        data: result.data,
        originalSize: result.originalSize,
        resultSize: result.resultSize,
        // Workers may report extra fields (image width/height); keep them.
        ...(result.extra ?? {}),
      } as BaseTaskResult);
    } catch (err) {
      onProgress(
        task.id,
        "error",
        undefined,
        err instanceof Error ? err.message : "PROCESS_FAILED"
      );
    }
  }

  async function processBatch(
    tasks: T[],
    options: O,
    onProgress: ProgressReporter<T>
  ): Promise<void> {
    // Pull from a shared queue so up to `concurrency` workers stay busy.
    const queue = [...tasks];

    const runners = Array.from({ length: Math.max(1, transport.concurrency) }, async () => {
      for (let task = queue.shift(); task; task = queue.shift()) {
        await runTask(task, options, onProgress);
      }
    });

    await Promise.all(runners);
  }

  return {
    processBatch,
    concurrency: transport.concurrency,
    terminate: () => transport.terminate(),
  };
}
