// Playwright smoke scaffold for upload/edit/export flow.
// To wire this up, add Playwright config and npm scripts.

import { test, expect } from "@playwright/test";

test.describe("GifAlchemy smoke", () => {
  test("upload -> edit -> export happy path", async ({ page }) => {
    await page.goto("/editor");

    // TODO: upload fixture file and wait for timeline render.
    // await page.getByLabel("Upload").setInputFiles("tests/fixtures/sample.gif");

    // TODO: add text layer and apply effect.
    // await page.getByRole("button", { name: "Add text layer" }).click();

    // TODO: start export and assert completion toast or download event.
    // await page.getByRole("button", { name: "Export" }).click();

    await expect(page).toHaveURL(/editor/);
  });
});
