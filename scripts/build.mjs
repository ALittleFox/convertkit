#!/usr/bin/env node
/**
 * Guard: this project must be built with webpack, never Turbopack.
 *
 * Why: `next build` (Turbopack, the Next 16 default) hangs indefinitely in this
 * repo. It spawns `.next/build/postcss.js` as a child process and never gets a
 * response back, so the build sits at "Creating an optimized production build
 * ..." forever. `next dev` (also Turbopack) is fine, and `next build --webpack`
 * is fine, so this is specific to the Turbopack production pipeline.
 *
 * Worst case this fails loudly instead of producing a broken/absent bundle.
 * The reliable way to trigger it is `pnpm build` (which passes --webpack);
 * `vercel.json` points Vercel at that same script.
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (!args.includes("--webpack")) {
  console.error(
    [
      "",
      "✖ Refusing to run `next build` without --webpack.",
      "",
      "  Turbopack production builds hang in this project (the PostCSS child",
      "  process never responds). Use one of:",
      "",
      "    pnpm build                    # preferred",
      "    npx next build --webpack",
      "",
      "  `pnpm dev` is unaffected.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const result = spawnSync("next", ["build", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
