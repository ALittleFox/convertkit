import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("root shows the home page", async ({ page }) => {
    await page.goto("/");
    // The app used to redirect "/" to "/compress"; it now renders a landing
    // page listing every tool.
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("header shows logo and nav links", async ({ page }) => {
    await page.goto("/compress");

    await expect(page.getByText("ConvertKit")).toBeVisible();
    await expect(page.getByRole("link", { name: "图片压缩" })).toBeVisible();
    await expect(page.getByRole("link", { name: "图片转码" })).toBeVisible();
  });

  test("navigate between compress and convert", async ({ page }) => {
    await page.goto("/compress");
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();

    await page.getByRole("link", { name: "图片转码" }).click();
    await expect(page).toHaveURL("/convert");
    await expect(page.getByRole("heading", { name: "批量格式转换" })).toBeVisible();

    await page.getByRole("link", { name: "图片压缩" }).click();
    await expect(page).toHaveURL("/compress");
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();
  });

  test("active nav link is highlighted", async ({ page }) => {
    await page.goto("/compress");
    const compressBtn = page
      .getByRole("link", { name: "图片压缩" })
      .locator("button");
    // The active item swaps the ghost variant for the secondary one.
    await expect(compressBtn).toHaveClass(/bg-primary\/10/);
  });
});
