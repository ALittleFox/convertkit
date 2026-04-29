export interface WorkerTask {
  id: string;
  data: ArrayBuffer;
  type: "compress" | "convert";
  options: {
    quality?: number;
    lossless?: boolean;
    effort?: number;
    targetFormat?: string;
  };
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
}

export interface WorkerResult {
  data: ArrayBuffer;
  width: number;
  height: number;
  originalSize: number;
  resultSize: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private busyWorkers: Map<Worker, WorkerTask> = new Map();
  private taskQueue: WorkerTask[] = [];
  private maxWorkers: number;

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || Math.min(navigator.hardwareConcurrency || 2, 4);
    this.init();
  }

  private init() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker() {
    const worker = new Worker(
      new URL("../workers/codec.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);

    this.workers.push(worker);
    this.idleWorkers.push(worker);
  }

  private handleWorkerMessage(worker: Worker, e: MessageEvent) {
    const { id, success, data, width, height, originalSize, resultSize, error } = e.data;

    const task = this.busyWorkers.get(worker);
    if (!task || task.id !== id) return;

    this.busyWorkers.delete(worker);
    this.taskQueue = this.taskQueue.filter((t) => t.id !== id);

    if (success) {
      task.resolve({ data, width, height, originalSize, resultSize });
    } else {
      task.reject(new Error(error || "Worker processing failed"));
    }

    this.idleWorkers.push(worker);
    this.processNext();
  }

  private handleWorkerError(worker: Worker, e: ErrorEvent) {
    console.error("Worker error:", e);

    const assignedTask = this.busyWorkers.get(worker);
    if (assignedTask) {
      assignedTask.reject(new Error("Worker crashed"));
      this.taskQueue = this.taskQueue.filter((t) => t.id !== assignedTask.id);
      this.busyWorkers.delete(worker);
    }

    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
    }

    worker.terminate();
    this.createWorker();
  }

  private processNext() {
    if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) {
      return;
    }

    const worker = this.idleWorkers.pop()!;
    const assignedIds = new Set(Array.from(this.busyWorkers.values(), (t) => t.id));
    const task = this.taskQueue.find((t) => !assignedIds.has(t.id));

    if (!task) {
      this.idleWorkers.push(worker);
      return;
    }

    this.busyWorkers.set(worker, task);
    worker.postMessage(
      {
        id: task.id,
        data: task.data,
        type: task.type,
        options: task.options,
      },
      [task.data]
    );
  }

  async process(data: ArrayBuffer, type: "compress" | "convert", options: WorkerTask["options"]): Promise<WorkerResult> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id,
        data,
        type,
        options,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processNext();
    });
  }

  terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue.forEach((task) => task.reject(new Error("Pool terminated")));
    this.taskQueue = [];
  }
}

let pool: WorkerPool | null = null;

export function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool();
  }
  return pool;
}
