import type { VideoFileTask, BaseTaskResult } from "./task-types";
import { createWorkerBatchEngine } from "./worker-batch-engine";

export type { VideoFileTask };
export type VideoWorkerResult = BaseTaskResult;

export interface VideoProcessOptions {
  outputFormat: "mp4" | "webm" | "mov" | "gif";
  videoCodec: "h264" | "h265" | "vp9";
  crf: number;
  scaleWidth?: number;
  scaleHeight?: number;
  removeAudio: boolean;
}

const engine = createWorkerBatchEngine<VideoFileTask, VideoProcessOptions>(
  () =>
    new Worker(new URL("../workers/transcode.worker.ts", import.meta.url), {
      type: "module",
    }),
  (task, buffer, options) => ({
    data: {
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
    transfers: [buffer],
  })
);

export const processVideoBatch = engine.processBatch;
export const terminateVideoWorker = engine.terminate;
