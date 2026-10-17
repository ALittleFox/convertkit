import { test, expect } from "@playwright/test";
import path from "path";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const MP4 = path.join(__dirname, "fixtures/sample.mp4");

test.describe("CSP compatibility", () => {
  test("CSP header is present", async ({ request }) => {
    const res = await request.get("/compress");
    const csp =
      res.headers()["content-security-policy"] ??
      res.headers()["content-security-policy-report-only"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
  });

  test("image worker + blob preview work under CSP", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) {
        violations.push(m.text());
      }
    });

    await page.goto("/compress");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "csp.png", mimeType: "image/png", buffer: PNG });

    await expect(page.getByText("结果大小")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("完成")).toBeVisible({ timeout: 30_000 });
    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  test("FFmpeg WASM worker runs under CSP", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) {
        violations.push(m.text());
      }
    });

    await page.goto("/transcode");
    await page.locator('input[type="file"]').setInputFiles(MP4);

    await expect(page.getByText("结果大小")).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText("完成")).toBeVisible({ timeout: 180_000 });
    expect(violations, violations.join("\n")).toHaveLength(0);
  });
});
