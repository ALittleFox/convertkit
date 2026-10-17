/**
 * Worker transports for the batch engines.
 *
 * A transport knows *how* to run one task on a worker and report back. The
 * batch engine (`worker-batch-engine.ts`) only knows *how to iterate* tasks and
 * translate events into progress callbacks. Splitting these lets every feature
 * share one processBatch signature while keeping their different concurrency
 * strategies:
 *
 *   - images  → a pool of N workers (CPU-bound, parallelises well)
 *   - audio / video → a single worker (FFmpeg holds ~100 MB of WASM state per
 *     instance, so running several at once is counter-productive)
 */

export interface TransportResult {
  data: ArrayBuffer;
  originalSize: number;
  resultSize: number;
  /** Extra payload fields some workers additionally report (e.g. image size). */
  extra?: Record<string, unknown>;
}

export interface TransportMessage {
  data: Record<string, unknown>;
  transfers?: Transferable[];
}

export interface TransportCallbacks {
  onProgress?: (progress: number) => void;
}

export interface Transport {
  /**
   * Run a single task. Resolves with the worker's result payload.
   * Rejects if the worker reports an error or crashes.
   */
  run(message: TransportMessage, callbacks: TransportCallbacks): Promise<TransportResult>;
  /** Maximum number of tasks that may run concurrently. */
  readonly concurrency: number;
  terminate(): void;
}

/** Raw payload a worker sends back, normalised across both worker styles. */
interface RawWorkerResponse {
  id?: string;
  /** codec.worker style */
  success?: boolean;
  /** audio/video worker style */
  type?: "progress" | "result" | "error";
  progress?: number;
  data?: ArrayBuffer;
  originalSize?: number;
  resultSize?: number;
  error?: string;
}

function toResult(res: RawWorkerResponse): TransportResult {
  // Preserve any worker-specific fields (the image worker returns width/height).
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(res)) {
    if (k === "data" || k === "originalSize" || k === "resultSize") continue;
    if (k === "id" || k === "success" || k === "type" || k === "progress" || k === "error") continue;
    extra[k] = v;
  }
  return {
    data: res.data as ArrayBuffer,
    originalSize: res.originalSize ?? 0,
    resultSize: res.resultSize ?? 0,
    extra: Object.keys(extra).length ? extra : undefined,
  };
}

/**
 * Single persistent worker. Used by the FFmpeg engines (audio/video), which
 * stream per-task `progress` events and one final `result`.
 */
export function createSingleTransport(workerFactory: () => Worker): Transport {
  let worker: Worker | null = null;

  function getWorker(): Worker {
    if (!worker) worker = workerFactory();
    return worker;
  }

  return {
    concurrency: 1,

    run(message, { onProgress }) {
      const w = getWorker();
      return new Promise<TransportResult>((resolve, reject) => {
        const handler = (e: MessageEvent<RawWorkerResponse>) => {
          const res = e.data;

          if (res.type === "progress") {
            onProgress?.(res.progress ?? 0);
            return;
          }

          w.removeEventListener("message", handler);

          if (res.type === "result") resolve(toResult(res));
          else if (res.type === "error") reject(new Error(res.error ?? "WORKER_ERROR"));
          else reject(new Error("UNEXPECTED_WORKER_MESSAGE"));
        };

        w.addEventListener("message", handler);
        w.postMessage(message.data, message.transfers ?? []);
      });
    },

    terminate() {
      worker?.terminate();
      worker = null;
    },
  };
}

/**
 * Pool of N workers with a work queue and crash recovery. Used by the image
 * codec engine, where tasks are independent and there are many of them.
 */
export function createPooledTransport(
  workerFactory: () => Worker,
  maxWorkers: number
): Transport {
  let workers: Worker[] = [];
  let idle: Worker[] = [];

  interface Pending {
    message: TransportMessage;
    onProgress?: (progress: number) => void;
    resolve: (r: TransportResult) => void;
    reject: (e: Error) => void;
  }

  // Requests waiting for a free worker, in FIFO order.
  const queue: Pending[] = [];
  // Which job each busy worker is currently running.
  const inFlight = new Map<Worker, Pending>();

  function spawn(): Worker {
    const worker = workerFactory();

    worker.onmessage = (e: MessageEvent<RawWorkerResponse>) => {
      const job = inFlight.get(worker);
      if (!job) return;

      const res = e.data;

      if (res.type === "progress") {
        job.onProgress?.(res.progress ?? 0);
        return;
      }

      inFlight.delete(worker);
      idle.push(worker);

      if (res.success === false) job.reject(new Error(res.error ?? "WORKER_ERROR"));
      else job.resolve(toResult(res));

      pump();
    };

    worker.onerror = (e: ErrorEvent) => {
      console.error("Worker crashed:", e.message);
      const job = inFlight.get(worker);
      inFlight.delete(worker);
      workers = workers.filter((w) => w !== worker);
      idle = idle.filter((w) => w !== worker);
      worker.terminate();

      job?.reject(new Error("WORKER_CRASHED"));

      // Replace the lost worker so the pool keeps its size.
      const replacement = spawn();
      workers.push(replacement);
      idle.push(replacement);
      pump();
    };

    return worker;
  }

  for (let i = 0; i < maxWorkers; i++) {
    workers.push(spawn());
    idle.push(workers[workers.length - 1]);
  }

  function pump() {
    while (queue.length > 0 && idle.length > 0) {
      const job = queue.shift()!;
      const worker = idle.pop()!;
      inFlight.set(worker, job);
      worker.postMessage(job.message.data, job.message.transfers ?? []);
    }
  }

  return {
    concurrency: maxWorkers,

    run(message, { onProgress }) {
      return new Promise<TransportResult>((resolve, reject) => {
        queue.push({ message, onProgress, resolve, reject });
        pump();
      });
    },

    terminate() {
      for (const worker of workers) worker.terminate();
      workers = [];
      idle = [];
      for (const job of queue.splice(0)) job.reject(new Error("TRANSPORT_TERMINATED"));
      for (const job of inFlight.values()) job.reject(new Error("TRANSPORT_TERMINATED"));
      inFlight.clear();
    },
  };
}
