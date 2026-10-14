import type { VideoFileTask, BaseTaskResult } from "./task-types";
import { createWorkerBatchEngine } from "./worker-batch-engine";

export type { VideoFileTask };
export type VideoWorkerResult = BaseTaskResult;

export interface VideoProcessOptions {
  outputFormat: "mp4" | "mov";
  videoCodec: "h264" | "h265";
  crf: number;
  scaleWidth?: number;
  scaleHeight?: number;
  removeAudio: boolean;
  audioBitrate?: number;
}

const engine = createWorkerBatchEngine<VideoFileTask, VideoProcessOptions>(
  () =>
    new Worker(new URL("../workers/media-transcode.worker.ts", import.meta.url), {
      type: "module",
    }),
  (task, buffer, options) => ({
    data: {
      id: task.id,
      kind: "video",
      fileData: buffer,
      fileName: task.file.name,
      options: {
        outputFormat: options.outputFormat,
        videoCodec: options.videoCodec,
        crf: options.crf,
        scaleWidth: options.scaleWidth,
        scaleHeight: options.scaleHeight,
        removeAudio: options.removeAudio,
        audioBitrate: options.audioBitrate,
      },
    },
    transfers: [buffer],
  })
);

export const processVideoBatch = engine.processBatch;
export const terminateVideoWorker = engine.terminate;
