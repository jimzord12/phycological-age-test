import { test, expect } from "@playwright/test";
import { assertNoA11yViolations, seedState } from "./helpers/axe-helper";
import { narrativeState } from "./helpers/state-seeds";

test.describe("Narrative exercise screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedState(page, narrativeState);
    await page.goto("/");
    // Wait for the narrative exercise to appear
    await page.waitForSelector("textarea");
  });

  test("no axe violations (WCAG 2.1 AA)", async ({ page }) => {
    await assertNoA11yViolations(page, "narrative screen – N01");
  });

  test("exercise title appears as a heading", async ({ page }) => {
    // Narrative exercise should have a heading for screen readers
    const headings = page.locator("h1, h2");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test("each textarea has an accessible label", async ({ page }) => {
    const textareas = page.locator("textarea");
    const count = await textareas.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const textarea = textareas.nth(i);
      const id = await textarea.getAttribute("id");
      const ariaLabel = await textarea.getAttribute("aria-label");
      const ariaLabelledby = await textarea.getAttribute("aria-labelledby");

      // Must have some form of accessible name
      const hasAccessibleName = id ? (await page.locator(`label[for="${id}"]`).count()) > 0 : false;

      expect(
        hasAccessibleName || !!ariaLabel || !!ariaLabelledby,
        `textarea ${i} should have an accessible name`,
      ).toBe(true);
    }
  });

  test("word count is conveyed as visible text", async ({ page }) => {
    // Each field shows a word count like "0 / 90 words" — check the first one
    const wordCountText = page
      .locator('[aria-live="polite"]')
      .first()
      .getByText(/\d+ \/ \d+ words/i);
    await expect(wordCountText).toBeVisible();
  });

  test("word count live region is accessible to assistive technology", async ({ page }) => {
    // The word count container must use aria-live so screen readers announce changes
    const ariaLiveRegions = page.locator('[aria-live="polite"]');
    const count = await ariaLiveRegions.count();
    expect(count).toBeGreaterThan(0);
  });

  test("OPTIONAL badge is visible", async ({ page }) => {
    // The exercise is optional — this must be communicated to all users
    await expect(page.getByText("OPTIONAL")).toBeVisible();
  });

  test('"Skip this exercise" button is keyboard accessible', async ({ page }) => {
    const skipBtn = page.getByRole("button", { name: /skip/i });
    await skipBtn.focus();
    await expect(skipBtn).toBeFocused();
  });

  test("Back and Continue buttons are keyboard accessible", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /^back$/i });
    await backBtn.focus();
    await expect(backBtn).toBeFocused();

    const continueBtn = page.getByRole("button", { name: /^continue$/i });
    await continueBtn.focus();
    await expect(continueBtn).toBeFocused();
  });

  test("privacy notice is visible below text fields", async ({ page }) => {
    // PRD §10.2: privacy notice must appear adjacent to narrative input
    // Text: "Your responses are stored only in this browser session and are never sent..."
    const privacyText = page.getByText(/browser session|never sent to our servers/i).first();
    await expect(privacyText).toBeVisible();
  });

  test("warning appears when approaching word limit", async ({ page }) => {
    // The first textarea (N01 "event" field, maxWords=90): warning at 80% = 72 words
    const textarea = page.locator("textarea").first();

    // Fill 75 words — above 72-word threshold, below 90-word cap
    const seventyFiveWords = Array.from({ length: 75 }, (_, i) => `word${i}`).join(" ");
    await textarea.fill(seventyFiveWords);

    // Warning text "approaching limit" should appear
    const warningText = page.getByText(/approaching limit/i);
    await expect(warningText).toBeVisible();
  });
});
