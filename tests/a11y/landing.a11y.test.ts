import { test, expect } from "@playwright/test";
import { assertNoA11yViolations } from "./helpers/axe-helper";

test.describe("Landing screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // No state seed: landing is the default view.
    await page.goto("/");
    await page.waitForSelector("h1");
  });

  test("no axe violations (WCAG 2.1 AA)", async ({ page }) => {
    await assertNoA11yViolations(page, "landing screen");
  });

  test("html element has lang attribute", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("page has a single h1", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test('"Start assessment" button is keyboard reachable and focusable', async ({ page }) => {
    const button = page.getByRole("button", { name: "Start assessment" });
    await button.focus();
    await expect(button).toBeFocused();
  });

  test('"How scoring works" details is keyboard operable', async ({ page }) => {
    const summary = page.getByText("How scoring works");
    await summary.focus();
    await summary.press("Enter");
    // After opening, the content should be visible
    await expect(page.getByText("Emotional Regulation")).toBeVisible();
  });

  test("privacy section has accessible landmark", async ({ page }) => {
    const section = page.locator('[aria-label="Privacy summary"]');
    await expect(section).toBeVisible();
  });

  test("no color-only information in overview stats", async ({ page }) => {
    const section = page.locator('[aria-label="Assessment overview"]');
    await expect(section).toBeVisible();
    // All stat spans should have text content (not just color/icon)
    const spans = section.locator("span");
    const count = await spans.count();
    for (let i = 0; i < count; i++) {
      const text = await spans.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test("focus is visible on interactive elements", async ({ page }) => {
    // Tab to the first interactive element
    await page.keyboard.press("Tab");
    // At least one element should be focused
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});
