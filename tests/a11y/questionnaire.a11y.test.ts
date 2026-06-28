import { test, expect } from "@playwright/test";
import { assertNoA11yViolations, seedState } from "./helpers/axe-helper";
import { questionnaireState } from "./helpers/state-seeds";

test.describe("Questionnaire screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedState(page, questionnaireState);
    await page.goto("/");
    // Wait for the first question to appear (questionnaire API must load first)
    await page.waitForSelector('[role="radiogroup"]');
  });

  test("no axe violations (WCAG 2.1 AA)", async ({ page }) => {
    await assertNoA11yViolations(page, "questionnaire screen – first question");
  });

  test("radiogroup has an accessible name", async ({ page }) => {
    const radiogroup = page.locator('[role="radiogroup"]');
    // aria-labelledby should point to the question heading
    const labelledby = await radiogroup.getAttribute("aria-labelledby");
    expect(labelledby, "radiogroup should have aria-labelledby").toBeTruthy();
    // The referenced heading must exist and have content
    const heading = page.locator(`#${labelledby}`);
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("all radio inputs have labels", async ({ page }) => {
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      // Each radio should be wrapped in a <label> or reference one via aria-labelledby
      const label = radio.locator("xpath=ancestor::label");
      const hasWrappingLabel = (await label.count()) > 0;
      if (!hasWrappingLabel) {
        const id = await radio.getAttribute("id");
        const externalLabel = page.locator(`label[for="${id}"]`);
        await expect(externalLabel, `radio ${i} should have an associated label`).toBeVisible();
      }
    }
  });

  test("Back button is always keyboard focusable", async ({ page }) => {
    const backBtn = page.getByRole("button", { name: /^back$/i });
    await backBtn.focus();
    await expect(backBtn).toBeFocused();
  });

  test("Continue enables and is keyboard focusable after selecting an option", async ({ page }) => {
    const radios = page.locator('input[type="radio"]');
    await radios.first().check();
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await expect(continueBtn).not.toBeDisabled();
    await continueBtn.focus();
    await expect(continueBtn).toBeFocused();
  });

  test("Continue is disabled without a selection", async ({ page }) => {
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await expect(continueBtn).toBeDisabled();
  });

  test("radio options are keyboard operable with arrow keys", async ({ page }) => {
    const radiogroup = page.locator('[role="radiogroup"]');
    const firstRadio = radiogroup.locator('input[type="radio"]').first();
    await firstRadio.focus();
    // Arrow-down should move focus/selection to the next radio
    await page.keyboard.press("ArrowDown");
    const secondRadio = radiogroup.locator('input[type="radio"]').nth(1);
    await expect(secondRadio).toBeFocused();
  });

  test("progress bar conveys step information accessibly", async ({ page }) => {
    // Progress information is available via aria-label on the progressbar role element
    const progressbar = page.locator('[role="progressbar"]');
    await expect(progressbar).toBeVisible();
    const ariaLabel = await progressbar.getAttribute("aria-label");
    expect(ariaLabel).toMatch(/step \d+ of \d+/i);
  });

  test("dimension label is visible alongside progress", async ({ page }) => {
    // Each question shows its full dimension label (not abbreviation)
    const dimensionLabels = [
      "Emotional Regulation",
      "Impulse Control",
      "Perspective-Taking",
      "Identity Stability",
      "Temporal Depth",
    ];
    const pageText = await page.textContent("body");
    const hasDimension = dimensionLabels.some((d) => pageText?.includes(d));
    expect(hasDimension).toBe(true);
  });

  test('"Exit and delete current answers" button is keyboard accessible', async ({ page }) => {
    const exitBtn = page.getByRole("button", { name: /exit/i });
    await exitBtn.focus();
    await expect(exitBtn).toBeFocused();
  });

  test("NA option is labeled distinctly", async ({ page }) => {
    // The "Not applicable" option should be visually distinguishable
    const naLabel = page.getByText(/not applicable/i).first();
    await expect(naLabel).toBeVisible();
  });
});
