import { test, expect } from "@playwright/test";
import { assertNoA11yViolations, seedState } from "./helpers/axe-helper";
import { consentState } from "./helpers/state-seeds";

test.describe("Consent screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedState(page, consentState);
    await page.goto("/");
    await page.waitForSelector("h1");
  });

  test("no axe violations (WCAG 2.1 AA)", async ({ page }) => {
    await assertNoA11yViolations(page, "consent screen");
  });

  test("page has a single h1", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("all checkboxes have associated labels", async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      const id = await checkbox.getAttribute("id");
      expect(id, `checkbox ${i} should have an id`).toBeTruthy();
      const label = page.locator(`label[for="${id}"]`);
      await expect(label, `checkbox ${i} should have a matching <label>`).toBeVisible();
    }
  });

  test("Continue button is initially disabled", async ({ page }) => {
    const continueBtn = page.getByRole("button", { name: "Continue" });
    // aria-disabled="true" signals disabled state to assistive technology
    await expect(continueBtn).toHaveAttribute("aria-disabled", "true");
  });

  test("Continue button enables after both required boxes are checked", async ({ page }) => {
    // Check "I am 18 years or older"
    await page.getByLabel("I am 18 years of age or older.").check();
    // Check "non-clinical" acknowledgement
    await page.getByLabel(/I understand this is a reflective self-assessment/).check();

    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).not.toHaveAttribute("aria-disabled", "true");
  });

  test("AI consent copy is always visible adjacent to the opt-in", async ({ page }) => {
    // PRD §7.2: disclosure must be shown regardless of checkbox state
    await expect(page.getByText(/Your written exercise responses will be sent/)).toBeVisible();
  });

  test("checkboxes are keyboard operable", async ({ page }) => {
    const checkbox = page.getByLabel("I am 18 years of age or older.");
    await checkbox.focus();
    await checkbox.press("Space");
    await expect(checkbox).toBeChecked();
  });

  test("Required and Optional fieldsets have legends", async ({ page }) => {
    const legends = page.locator("legend");
    const count = await legends.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const texts = await legends.allTextContents();
    const uppercased = texts.map((t) => t.toUpperCase());
    expect(uppercased).toContain("REQUIRED");
    expect(uppercased).toContain("OPTIONAL");
  });

  test("form uses noValidate with explicit aria-required on required inputs", async ({ page }) => {
    const form = page.locator("form");
    await expect(form).toHaveAttribute("novalidate");

    const requiredCheckboxes = page.locator('input[type="checkbox"][aria-required="true"]');
    const count = await requiredCheckboxes.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
