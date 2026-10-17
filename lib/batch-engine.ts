import type { FileTask } from "./task-types";
import { createWorkerBatchEngine } from "./worker-batch-engine";
import { createPooledTransport } from "./worker-transport";

export type { FileTask };

export interface ProcessOptions {
  quality?: number;
  lossless?: boolean;
  effort?: number;
  targetFormat?: string;
}

/** Options actually handed to the engine: caller options + the mode. */
interface ImageEngineOptions extends ProcessOptions {
  mode: "compress" | "convert";
}

/** How many image-codec workers to run in parallel. */
function poolSize(): number {
  return Math.min(navigator.hardwareConcurrency || 2, 4);
}

function createImageEngine() {
  return createWorkerBatchEngine<FileTask, ImageEngineOptions>(
    createPooledTransport(
      () =>
        new Worker(new URL("../workers/codec.worker.ts", import.meta.url), {
          type: "module",
        }),
      poolSize()
    ),
    (task, buffer, options) => ({
      data: {
        id: task.id,
        data: buffer,
        // `type` tells the codec worker whether to keep the format or switch.
        type: options.mode,
        options: {
          quality: options.quality,
          lossless: options.lossless,
          effort: options.effort,
          targetFormat: options.targetFormat,
        },
      },
      transfers: [buffer],
    })
  );
}

let engine: ReturnType<typeof createImageEngine> | null = null;

/**
 * Lazily create the shared image engine. Creating it eagerly would spawn
 * workers during SSR or on pages that never process images.
 */
function getEngine() {
  if (!engine) engine = createImageEngine();
  return engine;
}

export type ImageMode = "compress" | "convert";

/**
 * Process a batch of images. The signature mirrors the audio/video engines so
 * `useBatchProcess` can treat all three identically.
 */
export async function processBatch(
  tasks: FileTask[],
  mode: ImageMode,
  options: ProcessOptions,
  onProgress: Parameters<ReturnType<typeof getEngine>["processBatch"]>[2]
): Promise<void> {
  return getEngine().processBatch(tasks, { ...options, mode }, onProgress);
}

export function getPoolSize(): number {
  return getEngine().concurrency;
}
