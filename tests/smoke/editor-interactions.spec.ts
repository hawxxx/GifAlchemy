import { expect, test, type Page } from "@playwright/test";

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

test.describe("Editor interactions", () => {
  test.setTimeout(90_000);

  test("add text -> click to edit -> rotate icon visible", async ({ page }) => {
    await page.goto("/editor");
    await dismissBlockingDialog(page);

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await dismissBlockingDialog(page);
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();

    await page.getByRole("button", { name: /Add text/i }).first().click();
    await dismissBlockingDialog(page);
    await page.getByRole("button", { name: /^text$/i }).click();

    const overlay = page
      .locator("div.absolute.origin-center.select-none.whitespace-pre-wrap")
      .first();
    await expect(overlay).toBeVisible();

    await overlay.click();
    await overlay.click();
    await expect(page.locator('[contenteditable="true"]')).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Rotate text")).toBeVisible();
  });
});
