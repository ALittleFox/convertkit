import { test, expect } from "@playwright/test";

// 1x1 transparent PNG — same fixture the existing suite uses.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("Image engine (pooled transport)", () => {
  test("compresses a batch of files", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/compress");
    await page
      .locator('input[type="file"]')
      .setInputFiles(
        ["a", "b", "c", "d"].map((n) => ({
          name: `${n}.png`,
          mimeType: "image/png",
          buffer: PNG,
        }))
      );

    // Auto-compress is on by default; every card should reach "完成".
    await expect(page.getByText("结果大小")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("所有处理均在浏览器本地完成")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("keeps decoded dimensions available to the preview", async ({ page }) => {
    await page.goto("/compress");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "dim.png", mimeType: "image/png", buffer: PNG });

    await expect(page.getByText("结果大小")).toBeVisible({ timeout: 30_000 });
    await page.locator("button:has(svg.lucide-eye)").first().click();

    // Rendered from task.result.width/height, which are carried through the
    // transport's `extra` payload.
    await expect(page.getByText(/\d+ x \d+/).first()).toBeVisible();
  });

  test("converts to another format", async ({ page }) => {
    await page.goto("/convert");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "x.png", mimeType: "image/png", buffer: PNG });

    await expect(page.getByText("结果大小")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("完成")).toBeVisible({ timeout: 30_000 });
  });
});
