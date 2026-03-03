import { test, expect, type Page } from "@playwright/test";
const fixturePath = "tests/fixtures/sample.gif";

async function dismissBlockingDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  if (!(await dialog.isVisible().catch(() => false))) return;
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(dialog).toBeHidden();
}

test.describe("GifAlchemy smoke", () => {
  test.setTimeout(90_000);

  test("upload -> add text -> export", async ({ page }) => {
    await page.goto("/editor");
    await dismissBlockingDialog(page);

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await dismissBlockingDialog(page);
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();

    await page.getByRole("button", { name: /Add text/i }).first().click();
    await dismissBlockingDialog(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("gifalchemy:export-request"));
    });
    await expect(page.getByRole("button", { name: /Exporting/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
