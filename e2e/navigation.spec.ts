import { test, expect } from "@playwright/test";

// The app negotiates a locale from Accept-Language (pinned to zh-Hans in
// playwright.config.ts) and redirects bare paths to /<locale>/...
const L = "/zh-Hans";

test.describe("Navigation", () => {
  test("root negotiates a locale and lands on the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(`${L}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("bare feature path redirects to the negotiated locale", async ({ page }) => {
    await page.goto("/compress");
    await expect(page).toHaveURL(`${L}/compress`);
  });

  test("header shows logo and nav links", async ({ page }) => {
    await page.goto(`${L}/compress`);

    await expect(page.getByText("ConvertKit")).toBeVisible();
    await expect(page.getByRole("link", { name: "图片压缩" })).toBeVisible();
    await expect(page.getByRole("link", { name: "图片转码" })).toBeVisible();
  });

  test("navigate between compress and convert keeps the locale prefix", async ({
    page,
  }) => {
    await page.goto(`${L}/compress`);
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();

    await page.getByRole("link", { name: "图片转码" }).click();
    await expect(page).toHaveURL(`${L}/convert`);
    await expect(page.getByRole("heading", { name: "批量格式转换" })).toBeVisible();

    await page.getByRole("link", { name: "图片压缩" }).click();
    await expect(page).toHaveURL(`${L}/compress`);
    await expect(page.getByRole("heading", { name: "批量图片压缩" })).toBeVisible();
  });

  test("active nav link is highlighted", async ({ page }) => {
    await page.goto(`${L}/compress`);
    const compressBtn = page
      .getByRole("link", { name: "图片压缩" })
      .locator("button");
    await expect(compressBtn).toHaveClass(/bg-primary\/10/);
  });

  test("legacy URL shape 301s to the new one", async ({ page, request }) => {
    const res = await request.get("/compress/zh-Hant", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()["location"]).toBe("/zh-Hant/compress");
    void page;
  });
});
