# I016 — Manual Accessibility Checks

Automated axe tests cover machine-detectable WCAG 2.1 AA violations. These checks
require human judgement and must be verified manually before each release.

Last verified: — (not yet performed)

---

## Checklist

Mark each item ✅ pass · ❌ fail · ⚠️ partial · — not yet verified.

### 1. Keyboard-only navigation (all screens)

| #   | Check                                                                                                                                               | Status | Notes |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| K1  | Complete the full assessment flow (landing → consent → all 26 steps → review → results) using Tab/Shift-Tab/Enter/Space/Arrow keys only — no mouse. | —      |       |
| K2  | Every interactive element (button, checkbox, radio, textarea, link) receives visible keyboard focus.                                                | —      |       |
| K3  | Focus is never trapped outside a dialog/confirm prompt.                                                                                             | —      |       |
| K4  | After "Exit and delete current answers" `window.confirm`, focus returns to a logical location (landing).                                            | —      |       |
| K5  | Tab order matches visual/reading order on all screens.                                                                                              | —      |       |

### 2. Screen-reader compatibility

| #   | Check                                                                                                                         | Status | Notes |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| S1  | Using NVDA+Chrome or VoiceOver+Safari, read through the landing screen. All text content and section landmarks are announced. | —      |       |
| S2  | Consent screen: checkboxes announce their labels and required/optional status correctly.                                      | —      |       |
| S3  | Questionnaire: radiogroup label (question prompt) is announced before reading the options.                                    | —      |       |
| S4  | Progress ("Step X of 26") and dimension label are announced.                                                                  | —      |       |
| S5  | Narrative screen: word count and the OPTIONAL badge are announced. The privacy notice is read.                                | —      |       |
| S6  | Results screen: score bars announce their `aria-label` ("Score: N out of 100"). Band labels are announced.                    | —      |       |
| S7  | Loading state announces "Calculating your results…" via `aria-live="polite"`.                                                 | —      |       |
| S8  | Error state `role="alert"` causes an immediate announcement.                                                                  | —      |       |
| S9  | Age metaphor qualifying copy is announced when the metaphor is shown.                                                         | —      |       |

### 3. Color contrast and non-color information

| #   | Check                                                                                                                           | Status | Notes |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| C1  | In Windows High Contrast mode, all text remains legible and interactive elements retain visible outlines.                       | —      |       |
| C2  | The "amber border" on unanswered dimension cards (review screen) has an additional text label or icon — not border color alone. | —      |       |
| C3  | Confidence label (high/moderate/low) is expressed in text, not color alone.                                                     | —      |       |
| C4  | Selected radio option highlight is indicated by more than color (e.g. border change, checkmark).                                | —      |       |

### 4. 200% zoom and narrow viewport

| #   | Check                                                                                                                                                   | Status | Notes |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| Z1  | At 200% zoom (browser zoom, not device zoom) in a 1280px-wide viewport: no content overflows horizontally; buttons remain fully visible.                | —      |       |
| Z2  | At 320px viewport width (Playwright `mobile` project covers 393px; verify 320px manually): all screens are usable and no horizontal scroll bar appears. | —      |       |
| Z3  | At 200% zoom, the questionnaire radio group remains readable and selectable.                                                                            | —      |       |

### 5. Reduced motion

| #   | Check                                                                                                                                          | Status | Notes |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| M1  | With `prefers-reduced-motion: reduce` set in browser settings (or OS): no elements animate or transition in a way that could cause discomfort. | —      |       |
| M2  | The progress bar fill does not animate on reduced-motion.                                                                                      | —      |       |

### 6. Focus management after navigation

| #   | Check                                                                                                                                    | Status | Notes |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| F1  | After clicking "Continue" on the questionnaire, focus moves to the new question heading (the `tabIndex={-1}` `<h2>`).                    | —      |       |
| F2  | After clicking "Back", focus moves to a logical target (not stuck at the previous Continue button position).                             | —      |       |
| F3  | After clicking an "Edit" button on the review screen, the questionnaire shows the correct question and focus is on the question heading. | —      |       |
| F4  | On the results screen, focus moves to the main heading on mount (`headingRef.current?.focus()`).                                         | —      |       |

### 7. Language attribute

| #   | Check                                                                                                              | Status | Notes |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| L1  | `<html lang="en">` is present (automated test covers this; verify the value is correct for the deployment locale). | —      |       |

### 8. Touch target size (mobile)

| #   | Check                                                                                         | Status | Notes |
| --- | --------------------------------------------------------------------------------------------- | ------ | ----- |
| T1  | On a mobile device or devtools emulation, each radio option row is at least 44×44 CSS pixels. | —      |       |
| T2  | All buttons have a minimum 44px height.                                                       | —      |       |

---

## How to run manual checks

1. Start the app: `pnpm dev`
2. Open `http://localhost:3000` in Chrome/Safari.
3. For screen-reader checks: enable NVDA (Windows) or VoiceOver (macOS/iOS).
4. For reduced-motion: open DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion".
5. For 320px viewport: open DevTools → Device Toolbar → set width to 320.
6. For High Contrast: Windows Settings → Accessibility → High Contrast.

Update the Status column with the date of the check (e.g. `✅ 2026-07-01`).
