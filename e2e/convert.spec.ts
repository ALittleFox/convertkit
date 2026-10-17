import { test, expect } from "@playwright/test";

test.describe("Convert page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/convert");
  });

  test("shows page heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "批量格式转换" })).toBeVisible();
  });

  test("shows drop zone", async ({ page }) => {
    await expect(page.getByText("拖拽图片到此处")).toBeVisible();
  });

  test("shows convert settings with target format selector", async ({ page }) => {
    await expect(page.getByText("转换设置")).toBeVisible();
    // "目标格式" is rendered both as the field label and inside the select
    // trigger, so scope to the label element to avoid strict-mode violations.
    await expect(page.getByText("目标格式").first()).toBeVisible();
    await expect(page.getByText("质量", { exact: true }).first()).toBeVisible();
  });

  test("target format defaults to WebP", async ({ page }) => {
    const trigger = page.locator("[data-slot='select-trigger']").first();
    await expect(trigger).toContainText(/webp/i);
  });

  test("can change target format to AVIF", async ({ page }) => {
    const trigger = page.locator("[data-slot='select-trigger']").first();
    await trigger.click();

    await expect(page.getByRole("option", { name: "AVIF" })).toBeVisible();

    await page.getByRole("option", { name: "AVIF" }).click();
    await expect(trigger).toContainText(/avif/i);
  });

  test("shows effort slider when AVIF selected", async ({ page }) => {
    const trigger = page.locator("[data-slot='select-trigger']").first();
    await trigger.click();
    await page.getByRole("option", { name: "AVIF" }).click();

    await expect(page.getByText("压缩力度")).toBeVisible();
    await expect(page.getByText("值越高速度越慢，质量越好")).toBeVisible();
  });

  test("shows lossless checkbox when WebP selected", async ({ page }) => {
    // WebP is default, but the initial options might not have targetFormat set
    // Select WebP explicitly to ensure it's set
    const trigger = page.locator("[data-slot='select-trigger']").first();
    await trigger.click();
    await page.getByRole("option", { name: "WebP" }).click();

    await expect(page.getByText("无损压缩")).toBeVisible();
  });

  test("hides lossless checkbox for JPEG", async ({ page }) => {
    const trigger = page.locator("[data-slot='select-trigger']").first();
    await trigger.click();
    await page.getByRole("option", { name: "JPEG" }).click();

    await expect(page.getByText("无损压缩")).not.toBeVisible();
  });

  test("can add files and shows convert button", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await fileInput.setInputFiles({ name: "test.png", mimeType: "image/png", buffer });

    await expect(page.getByText("1 个文件", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "开始转换" })).toBeVisible();
  });
});
