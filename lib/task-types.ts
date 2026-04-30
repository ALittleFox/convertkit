import type { WorkerResult } from "./worker-manager";

export interface BaseTaskResult {
  data: ArrayBuffer;
  originalSize: number;
  resultSize: number;
}

export interface BaseTask {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  result?: BaseTaskResult;
  resultBlob?: Blob;
  error?: string;
  originalUrl?: string;
  resultUrl?: string;
}

export type FileTask = BaseTask & {
  result?: WorkerResult;
};

export type VideoFileTask = BaseTask & {
  duration?: number;
  thumbnail?: string;
};

export type AudioFileTask = BaseTask & {
  duration?: number;
};
