#!/usr/bin/env node
/**
 * Type-check the project with a clean Next.js type cache.
 *
 * `tsconfig.json` includes `.next/types/**`, which Next.js regenerates on every
 * build/dev run. After deleting a route (or switching branches) those generated
 * files can linger and `tsc` then fails on imports of modules that no longer
 * exist. Removing the cache first makes `typecheck` deterministic.
 */
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

rmSync(".next/types", { recursive: true, force: true });
rmSync(".next/dev/types", { recursive: true, force: true });

const result = spawnSync("npx", ["tsc", "--noEmit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
