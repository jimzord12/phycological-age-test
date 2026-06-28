/**
 * Shared axe-core helper for accessibility tests.
 *
 * Wraps @axe-core/playwright and provides a consistent scan helper that
 * formats violations as readable Playwright test failures.
 */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { STORAGE_KEY, serialise } from "./state-seeds";

/**
 * Run an axe accessibility scan on the current page and assert no violations.
 * Provide `context` for the label shown in failure output.
 */
export async function assertNoA11yViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  const violations = results.violations;
  if (violations.length === 0) return;

  const summary = violations
    .map(
      (v) =>
        `[${v.impact ?? "unknown"}] ${v.id}: ${v.description}\n` +
        v.nodes
          .slice(0, 3)
          .map((n) => `  → ${n.html}`)
          .join("\n"),
    )
    .join("\n\n");

  expect(violations, `axe violations on ${context}:\n\n${summary}\n`).toHaveLength(0);
}

/**
 * Seed sessionStorage before the page loads so the app renders the desired
 * screen. Must be called before page.goto().
 */
export async function seedState(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: Record<string, any>,
): Promise<void> {
  const key = STORAGE_KEY;
  const value = serialise(state as Parameters<typeof serialise>[0]);
  await page.addInitScript(
    ({ k, v }: { k: string; v: string }) => {
      window.sessionStorage.setItem(k, v);
    },
    { k: key, v: value },
  );
}
