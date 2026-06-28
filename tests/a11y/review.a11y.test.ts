import { test, expect } from "@playwright/test";
import { assertNoA11yViolations, seedState } from "./helpers/axe-helper";
import { reviewState } from "./helpers/state-seeds";

test.describe("Review screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedState(page, reviewState);
    await page.goto("/");
    // Wait for review screen — identified by the Submit button
    await page.waitForSelector('button:has-text("Submit")');
  });

  test("no axe violations (WCAG 2.1 AA)", async ({ page }) => {
    await assertNoA11yViolations(page, "review screen");
  });

  test("page has a single h1", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("Submit button is keyboard focusable", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /submit/i });
    await submitBtn.focus();
    await expect(submitBtn).toBeFocused();
  });

  test("Back button is keyboard accessible", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /back/i });
    await backBtn.focus();
    await expect(backBtn).toBeFocused();
  });

  test("Edit buttons for questions are keyboard accessible", async ({ page }) => {
    const editButtons = page.getByRole("button", { name: /edit/i });
    const count = await editButtons.count();
    expect(count).toBeGreaterThan(0);

    // Check that the first Edit button is focusable
    await editButtons.first().focus();
    await expect(editButtons.first()).toBeFocused();
  });

  test("dimension sections have meaningful headings", async ({ page }) => {
    const headings = page.locator("h2, h3");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test("completion status is conveyed in text, not color alone", async ({ page }) => {
    // Status should be in text (e.g., "answered", "unanswered", "N/A")
    const statusTexts = page.getByText(/answered|unanswered|complete|incomplete|skipped/i);
    const count = await statusTexts.count();
    expect(count).toBeGreaterThan(0);
  });

  test("narrative exercise status is shown in text", async ({ page }) => {
    // Narrative status tags (Complete, Partial, Skipped) must be text
    const narrativeStatusText = page.getByText(/complete|partial|skipped/i);
    const count = await narrativeStatusText.count();
    expect(count).toBeGreaterThan(0);
  });

  test("choices summary (AI/age-metaphor) is present and readable", async ({ page }) => {
    // The read-only choices summary should be visible
    const body = await page.textContent("body");
    // Should mention AI analysis or age metaphor choices
    const hasChoiceInfo = /ai analysis|age metaphor/i.test(body ?? "");
    expect(hasChoiceInfo).toBe(true);
  });
});
