import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("root redirects to /compress", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/compress");
  });

  test("header shows logo and nav links", async ({ page }) => {
    await page.goto("/compress");

    await expect(page.getByText("ConvertKit")).toBeVisible();
    await expect(page.getByRole("link", { name: "压缩" })).toBeVisible();
    await expect(page.getByRole("link", { name: "转换" })).toBeVisible();
  });

  test("navigate between compress and convert", async ({ page }) => {
    await page.goto("/compress");
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();

    await page.getByRole("link", { name: "转换" }).click();
    await expect(page).toHaveURL("/convert");
    await expect(page.getByRole("heading", { name: "批量格式转换" })).toBeVisible();

    await page.getByRole("link", { name: "压缩" }).click();
    await expect(page).toHaveURL("/compress");
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();
  });

  test("active nav link has secondary styling", async ({ page }) => {
    await page.goto("/compress");
    const compressBtn = page.getByRole("link", { name: "压缩" }).locator("button");
    // The active button should have bg-secondary class
    await expect(compressBtn).toHaveClass(/bg-secondary/);
  });
});
