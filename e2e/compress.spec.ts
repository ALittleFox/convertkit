import { test, expect } from "@playwright/test";

test.describe("Compress page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/zh-Hans/compress");
  });

  test("shows drop zone with correct text", async ({ page }) => {
    await expect(page.getByText("拖拽图片到此处")).toBeVisible();
    await expect(page.getByText("或点击选择文件")).toBeVisible();
    await expect(page.getByText("支持 JPEG, PNG, WebP, AVIF")).toBeVisible();
  });

  test("shows compress settings panel", async ({ page }) => {
    await expect(page.getByText("压缩设置")).toBeVisible();
    await expect(page.getByText("质量", { exact: true })).toBeVisible();
  });

  test("does not show target format selector in compress mode", async ({ page }) => {
    await expect(page.getByText("目标格式")).not.toBeVisible();
  });

  test("does not show file list when empty", async ({ page }) => {
    await expect(page.getByText("个文件")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "清空" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "开始压缩" })).not.toBeVisible();
  });

  test("file input accepts correct mime types", async ({ page }) => {
    const input = page.locator('input[type="file"]');
    await expect(input).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/avif"
    );
    await expect(input).toHaveAttribute("multiple");
  });

  test("can add files via file input", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer,
    });

    await expect(page.getByText("1 个文件", { exact: true })).toBeVisible();
    await expect(page.getByText("test.png")).toBeVisible();
    await expect(page.getByRole("button", { name: "清空" })).toBeVisible();
    // Auto-compress is on by default, so the manual "开始压缩" button is not
    // rendered; the file is processed immediately instead.
    await expect(page.getByText("压缩设置")).toBeVisible();
  });

  test("can add multiple files", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: pngBuffer },
      { name: "b.png", mimeType: "image/png", buffer: pngBuffer },
      { name: "c.png", mimeType: "image/png", buffer: pngBuffer },
    ]);

    await expect(page.getByText("3 个文件", { exact: true })).toBeVisible();
    await expect(page.getByText("a.png")).toBeVisible();
    await expect(page.getByText("b.png")).toBeVisible();
    await expect(page.getByText("c.png")).toBeVisible();
  });

  test("can remove a file", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer },
      { name: "b.png", mimeType: "image/png", buffer },
    ]);

    await expect(page.getByText("2 个文件", { exact: true })).toBeVisible();

    // Click the X button on the first file card
    const removeButtons = page.locator('button:has(svg.lucide-x)');
    await removeButtons.first().click();

    await expect(page.getByText("1 个文件", { exact: true })).toBeVisible();
    await expect(page.getByText("a.png")).not.toBeVisible();
    await expect(page.getByText("b.png")).toBeVisible();
  });

  test("can clear all files", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles({ name: "test.png", mimeType: "image/png", buffer });
    await expect(page.getByText("1 个文件", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "清空" }).click();
    await expect(page.getByText("个文件")).not.toBeVisible();
  });

  test("shows summary bar after adding files", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles({ name: "test.png", mimeType: "image/png", buffer });

    await expect(page.getByText("文件", { exact: true })).toBeVisible();
    await expect(page.getByText("原始大小")).toBeVisible();
  });

  test("start button disabled when no pending files", async ({ page }) => {
    await expect(page.getByRole("button", { name: "开始压缩" })).not.toBeVisible();
  });
});
