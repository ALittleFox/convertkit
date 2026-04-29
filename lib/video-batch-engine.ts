export interface VideoProcessOptions {
  outputFormat: "mp4" | "webm" | "mov" | "gif";
  videoCodec: "h264" | "h265" | "vp9";
  crf: number;
  scaleWidth?: number;
  scaleHeight?: number;
  removeAudio: boolean;
}

export interface VideoFileTask {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  result?: VideoWorkerResult;
  resultBlob?: Blob;
  error?: string;
  originalUrl?: string;
  resultUrl?: string;
  duration?: number;
  thumbnail?: string;
}

export interface VideoWorkerResult {
  data: ArrayBuffer;
  originalSize: number;
  resultSize: number;
}

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/transcode.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

export async function processVideoBatch(
  tasks: VideoFileTask[],
  options: VideoProcessOptions,
  onProgress: (
    taskId: string,
    status: VideoFileTask["status"],
    result?: VideoWorkerResult,
    error?: string,
    progress?: number
  ) => void
): Promise<void> {
  const w = getWorker();

  // Process sequentially (concurrency = 1)
  for (const task of tasks) {
    onProgress(task.id, "processing", undefined, undefined, 0);

    try {
      const buffer = await task.file.arrayBuffer();
      const result = await new Promise<VideoWorkerResult>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.id !== task.id) return;

          if (e.data.type === "progress") {
            onProgress(
              task.id,
              "processing",
              undefined,
              undefined,
              e.data.progress
            );
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
        w.postMessage(
          {
            id: task.id,
            fileData: buffer,
            fileName: task.file.name,
            options: {
              outputFormat: options.outputFormat,
              videoCodec: options.videoCodec,
              crf: options.crf,
              scaleWidth: options.scaleWidth,
              scaleHeight: options.scaleHeight,
              removeAudio: options.removeAudio,
            },
          },
          [buffer]
        );
      });

      onProgress(task.id, "done", result);
    } catch (err) {
      onProgress(
        task.id,
        "error",
        undefined,
        err instanceof Error ? err.message : "转码失败"
      );
    }
  }
}

export function terminateVideoWorker(): void {
  worker?.terminate();
  worker = null;
}
