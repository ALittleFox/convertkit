import { test, expect } from "@playwright/test";

test.describe("Theme", () => {
  // The theme toggle lives in the header's right-side action group. Using
  // `button.last()` picked up the mobile menu button instead, so target it by
  // its accessible label.
  test("theme toggle button is visible", async ({ page }) => {
    await page.goto("/zh-Hans/compress");
    const header = page.locator("header");
    await expect(
      header.getByRole("button", { name: /浅色|深色|跟随系统/ })
    ).toBeVisible();
  });

  test("can toggle theme", async ({ page }) => {
    await page.goto("/zh-Hans/compress");

    // The button's aria-label reflects the current theme and always changes on
    // click. The <html> class is not a reliable signal because the initial
    // `system` theme and `light` both resolve to the same "light" class.
    const toggle = page
      .locator("header")
      .getByRole("button", { name: /浅色|深色|跟随系统/ });

    const before = await toggle.first().getAttribute("aria-label");
    await toggle.first().click();
    await expect
      .poll(async () => toggle.first().getAttribute("aria-label"), { timeout: 5000 })
      .not.toBe(before);

    const afterOne = await toggle.first().getAttribute("aria-label");
    await toggle.first().click();
    await expect
      .poll(async () => toggle.first().getAttribute("aria-label"), { timeout: 5000 })
      .not.toBe(afterOne);

    // And the <html> element does pick up a concrete theme class.
    const html = page.locator("html");
    await expect(html).toHaveClass(/light|dark/);
  });
});
