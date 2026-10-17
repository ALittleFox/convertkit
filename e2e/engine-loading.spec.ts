import { test, expect } from "@playwright/test";

/**
 * The FFmpeg core is ~31 MB. Before this change the UI showed nothing while it
 * downloaded, so it looked frozen. These tests guard that loading progress is
 * actually reported, increases, and is not spammed.
 */
test.describe("Engine loading progress", () => {
  test("worker reports increasing, de-duplicated loading messages", async ({
    page,
    context,
  }) => {
    // Bypass the HTTP cache so the 31 MB core is really streamed.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

    // Record every loading/loaded message the worker posts.
    await page.addInitScript(() => {
      const w = window as unknown as { __ev: string[] };
      w.__ev = [];
      const OriginalWorker = window.Worker;

      const Patched = function (
        this: Worker,
        ...args: ConstructorParameters<typeof Worker>
      ) {
        const worker = new OriginalWorker(...args);
        worker.addEventListener("message", (e: MessageEvent) => {
          const d = e.data as { type?: string; progress?: number; phase?: string };
          if (d?.type === "loading" || d?.type === "loaded") {
            w.__ev.push(`${d.type}:${d.progress ?? ""}:${d.phase ?? ""}`);
          }
        });
        return worker;
      };
      Patched.prototype = OriginalWorker.prototype;
      window.Worker = Patched as unknown as typeof Worker;
    });

    await page.goto("/audio");
    await page
      .locator('input[type="file"]')
      .setInputFiles("e2e/fixtures/sample.m4a");

    // Wait until the engine finishes loading (or give up after 90s).
    await page.waitForFunction(
      () =>
        (window as unknown as { __ev: string[] }).__ev.some((e) =>
          e.startsWith("loaded")
        ),
      undefined,
      { timeout: 90_000 }
    );

    const events: string[] = await page.evaluate(
      () => (window as unknown as { __ev: string[] }).__ev
    );

    const loadingPcts = events
      .filter((e) => e.startsWith("loading:"))
      .map((e) => Number(e.split(":")[1]));

    // Progress was reported at all.
    expect(loadingPcts.length).toBeGreaterThan(1);
    // Percentages are monotonically non-decreasing.
    for (let i = 1; i < loadingPcts.length; i++) {
      expect(loadingPcts[i]).toBeGreaterThanOrEqual(loadingPcts[i - 1]);
    }
    // It actually advanced past 0.
    expect(Math.max(...loadingPcts)).toBeGreaterThan(0);
    // De-duplicated: nowhere near the thousands of raw stream chunks.
    expect(loadingPcts.length).toBeLessThan(300);
    // And it ends with the "loaded" signal.
    expect(events[events.length - 1].startsWith("loaded")).toBe(true);

    // The UI hint must be gone once loading finished.
    await expect(page.getByText(/正在加载引擎/)).toHaveCount(0);
  });
});
