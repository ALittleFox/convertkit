import { test, expect } from "@playwright/test";
import path from "path";
const MP4 = path.join(__dirname, "fixtures/sample.mp4");
const M4A = path.join(__dirname, "fixtures/sample.m4a");

test("audio engine transcodes m4a -> mp3", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("/zh-Hans/audio");
  await page.locator('input[type="file"]').setInputFiles(M4A);
  // Wait for a completed result.
  await expect(page.getByText("结果大小")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("完成")).toBeVisible({ timeout: 120_000 });
  expect(errs).toHaveLength(0);
});

test("video engine transcodes mp4 -> mp4", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("/zh-Hans/transcode");
  await page.locator('input[type="file"]').setInputFiles(MP4);
  await expect(page.getByText("结果大小")).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText("完成")).toBeVisible({ timeout: 180_000 });
  expect(errs).toHaveLength(0);
});
