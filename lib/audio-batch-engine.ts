export interface AudioProcessOptions {
  outputFormat: "mp3" | "aac" | "m4a" | "ogg" | "flac" | "wav";
  bitrate: number;
  sampleRate?: number;
}

export interface AudioFileTask {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  result?: AudioWorkerResult;
  resultBlob?: Blob;
  error?: string;
  originalUrl?: string;
  resultUrl?: string;
  duration?: number;
}

export interface AudioWorkerResult {
  data: ArrayBuffer;
  originalSize: number;
  resultSize: number;
}

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/audio-transcode.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

export async function processAudioBatch(
  tasks: AudioFileTask[],
  options: AudioProcessOptions,
  onProgress: (
    taskId: string,
    status: AudioFileTask["status"],
    result?: AudioWorkerResult,
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
      const result = await new Promise<AudioWorkerResult>((resolve, reject) => {
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
              bitrate: options.bitrate,
              sampleRate: options.sampleRate,
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

export function terminateAudioWorker(): void {
  worker?.terminate();
  worker = null;
}
