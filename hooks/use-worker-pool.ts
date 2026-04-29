"use client";

import { useEffect, useRef, useCallback } from "react";
import { WorkerPool, getPool, type WorkerResult } from "@/lib/worker-manager";

export function useWorkerPool() {
  const poolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    poolRef.current = getPool();

    return () => {
      if (poolRef.current) {
        poolRef.current.terminate();
        poolRef.current = null;
      }
    };
  }, []);

  const process = useCallback(
    async (
      data: ArrayBuffer,
      type: "compress" | "convert",
      options: Record<string, unknown>
    ): Promise<WorkerResult> => {
      if (!poolRef.current) {
        throw new Error("Worker pool not initialized");
      }
      return poolRef.current.process(data, type, options);
    },
    []
  );

  return { process };
}
