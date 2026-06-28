import { test, expect } from "@playwright/test";
import { assertNoA11yViolations, seedState } from "./helpers/axe-helper";
import { submittedState, submittedWithMetaphorState } from "./helpers/state-seeds";

/** Minimal valid score response matching ScoreResponseSchema. */
const MOCK_SCORE_RESPONSE = {
  assessmentId: "00000000-0000-0000-0000-000000000001",
  result: {
    scoringVersion: "RMP-SCORE-1.0",
    dimensions: {
      ER: { status: "reportable", score: 60, answered: 5, available: 5 },
      IC: { status: "reportable", score: 55, answered: 5, available: 5 },
      PT: { status: "reportable", score: 65, answered: 5, available: 5 },
      IS: { status: "reportable", score: 70, answered: 5, available: 5 },
      TD: { status: "reportable", score: 50, answered: 5, available: 5 },
    },
    structuredMaturityIndex: 60,
    profileBalance: { spread: 20, label: "some_unevenness" },
    confidence: { score: 85, label: "high", reasons: [] },
    ageMetaphor: null,
  },
};

/** Mock score response with one insufficient dimension (tests null-SMI path). */
const MOCK_SCORE_INSUFFICIENT = {
  ...MOCK_SCORE_RESPONSE,
  result: {
    ...MOCK_SCORE_RESPONSE.result,
    dimensions: {
      ...MOCK_SCORE_RESPONSE.result.dimensions,
      TD: { status: "insufficient_data", answered: 1, required: 3, available: 5 },
    },
    structuredMaturityIndex: null,
    profileBalance: null,
  },
};

/** Mock score response with age metaphor included. */
const MOCK_SCORE_WITH_METAPHOR = {
  ...MOCK_SCORE_RESPONSE,
  result: { ...MOCK_SCORE_RESPONSE.result, ageMetaphor: 35 },
};

test.describe("Results screen – accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/v1/assessments/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SCORE_RESPONSE),
      });
    });
    await seedState(page, submittedState);
    await page.goto("/");
    // Wait for results to load (loading spinner → results)
    await page.waitForSelector('[role="note"]');
  });

  test("no axe violations (WCAG 2.1 AA) – success state", async ({ page }) => {
    await assertNoA11yViolations(page, "results screen – success state");
  });

  test("non-clinical disclaimer uses role='note'", async ({ page }) => {
    const disclaimer = page.locator('[role="note"]');
    await expect(disclaimer).toBeVisible();
    const text = await disclaimer.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test("score bars have role=img with descriptive aria-label", async ({ page }) => {
    const bars = page.locator('[role="img"]');
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const label = await bars.nth(i).getAttribute("aria-label");
      expect(label?.trim().length, `bar ${i} aria-label should not be empty`).toBeGreaterThan(0);
    }
  });

  test("SMI score is visible as text", async ({ page }) => {
    // SMI should be shown as a large number or text fallback — never color-only
    const smiText = page.getByText(/\d+/).first();
    await expect(smiText).toBeVisible();
  });

  test("dimension section headings are present", async ({ page }) => {
    const headings = page.locator("h2");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Export JSON button is keyboard accessible", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export json/i });
    await exportBtn.focus();
    await expect(exportBtn).toBeFocused();
  });

  test("Export HTML button is keyboard accessible", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export html/i });
    await exportBtn.focus();
    await expect(exportBtn).toBeFocused();
  });

  test("Start a new assessment button is keyboard accessible", async ({ page }) => {
    const startOverBtn = page.getByRole("button", { name: /start a new assessment/i });
    await startOverBtn.focus();
    await expect(startOverBtn).toBeFocused();
  });

  test("confidence section conveys label and score as text", async ({ page }) => {
    // Confidence must be text-based (not color-only)
    const confidenceText = page.getByText(/high|moderate|low/i);
    await expect(confidenceText.first()).toBeVisible();
  });

  test("loading state uses aria-live and aria-busy", async ({ page, context }) => {
    // Create a new page to observe the loading state
    const slowPage = await context.newPage();

    // Intercept and delay the score API
    await slowPage.route("/api/v1/assessments/score", async (route) => {
      await new Promise((r) => setTimeout(r, 2_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SCORE_RESPONSE),
      });
    });

    await seedState(slowPage, submittedState);
    await slowPage.goto("/");

    // The loading paragraph should have aria-live and aria-busy
    const loadingEl = slowPage.locator('[aria-busy="true"]');
    await expect(loadingEl).toBeVisible();
    await expect(loadingEl).toHaveAttribute("aria-live", "polite");
    await slowPage.close();
  });

  test("error state uses role=alert", async ({ page, context }) => {
    const errorPage = await context.newPage();
    await errorPage.route("/api/v1/assessments/score", async (route) => {
      await route.fulfill({ status: 500, body: "error" });
    });
    await seedState(errorPage, submittedState);
    await errorPage.goto("/");
    // Exclude Next.js's built-in route announcer which also uses role="alert"
    const alert = errorPage.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await errorPage.close();
  });
});

test.describe("Results screen – insufficient dimension", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/v1/assessments/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SCORE_INSUFFICIENT),
      });
    });
    await seedState(page, submittedState);
    await page.goto("/");
    await page.waitForSelector('[role="note"]');
  });

  test("no axe violations with null SMI", async ({ page }) => {
    await assertNoA11yViolations(page, "results screen – null SMI");
  });

  test("insufficient dimension shows text fallback (not a score bar)", async ({ page }) => {
    // The DimensionCard renders a text label, not a score bar, for insufficient dimensions
    await expect(page.getByText("Insufficient data", { exact: true })).toBeVisible();
  });
});

test.describe("Results screen – age metaphor enabled", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/v1/assessments/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SCORE_WITH_METAPHOR),
      });
    });
    await seedState(page, submittedWithMetaphorState);
    await page.goto("/");
    await page.waitForSelector('[role="note"]');
  });

  test("no axe violations when age metaphor is shown", async ({ page }) => {
    await assertNoA11yViolations(page, "results screen – with age metaphor");
  });

  test("age metaphor includes qualifying copy", async ({ page }) => {
    // PRD: qualifying copy must always accompany the age metaphor.
    // The results screen shows: "This number is a rough metaphor... not a literal psychological age."
    const metaphorQualifier = page
      .getByText(/rough metaphor|metaphorical age|not.*chronological age/i)
      .first();
    await expect(metaphorQualifier).toBeVisible();
  });
});
