import type { AudioFileTask, BaseTaskResult } from "./task-types";
import { createWorkerBatchEngine } from "./worker-batch-engine";
import { createSingleTransport } from "./worker-transport";

export type { AudioFileTask };
export type AudioWorkerResult = BaseTaskResult;

export interface AudioProcessOptions {
  outputFormat: "mp3" | "aac" | "m4a" | "ogg" | "flac" | "wav";
  bitrate: number;
  sampleRate?: number;
}

const engine = createWorkerBatchEngine<AudioFileTask, AudioProcessOptions>(
  // FFmpeg keeps a large WASM heap per worker, so audio/video run one at a time.
  createSingleTransport(
    () =>
      new Worker(
        new URL("../workers/media-transcode.worker.ts", import.meta.url),
        { type: "module" }
      )
  ),
  (task, buffer, options) => ({
    data: {
      id: task.id,
      kind: "audio",
      fileData: buffer,
      fileName: task.file.name,
      options: {
        outputFormat: options.outputFormat,
        bitrate: options.bitrate,
        sampleRate: options.sampleRate,
      },
    },
    transfers: [buffer],
  })
);

export const processAudioBatch = engine.processBatch;
export const terminateAudioWorker = engine.terminate;
