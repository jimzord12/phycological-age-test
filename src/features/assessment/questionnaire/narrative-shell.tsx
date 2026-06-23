"use client";

import { useRef, useId } from "react";
import { useAssessment } from "@/client/assessment-context";
import { NARRATIVE_EXERCISES } from "@/domain/questionnaire";
import { countWords } from "@/domain/narrative-rubric";
import type { AssessmentPhase } from "@/client/assessment-state";

// ---------------------------------------------------------------------------
// Pure navigation helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export type NarrativeNavigationTarget = {
  phase: AssessmentPhase;
  stepIndex: number;
};

/**
 * Back target from a narrative exercise stepIndex (0 = N01, 1 = N02).
 * N01 goes back to the last structured question before it (index 7).
 * N02 goes back to the last structured question before it (index 13).
 */
export function narrativeBack(stepIndex: number): NarrativeNavigationTarget {
  if (stepIndex === 0) return { phase: "questionnaire", stepIndex: 7 };
  return { phase: "questionnaire", stepIndex: 13 };
}

/**
 * Continue/Skip target from a narrative exercise stepIndex.
 * N01 → questionnaire item 8 (first item after N01).
 * N02 → review screen.
 */
export function narrativeContinue(stepIndex: number): NarrativeNavigationTarget {
  if (stepIndex === 0) return { phase: "questionnaire", stepIndex: 8 };
  return { phase: "review", stepIndex: 0 };
}

/** Visual step numbers for N01 and N02 within the 26-step flow. */
export const NARRATIVE_VISUAL_STEPS: readonly [9, 16] = [9, 16];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NarrativeShell() {
  const { state, dispatch } = useAssessment();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  const stepIndex = state.stepIndex; // 0 = N01, 1 = N02
  const exercise = NARRATIVE_EXERCISES[stepIndex];

  if (!exercise) return null; // guard: phase "narrative" should only be stepIndex 0 or 1

  const visualStep = NARRATIVE_VISUAL_STEPS[stepIndex]!;
  const drafts = state.narrativeDrafts[exercise.id] ?? {};

  function focusHeading() {
    setTimeout(() => headingRef.current?.focus(), 0);
  }

  function navigate(target: NarrativeNavigationTarget) {
    dispatch({ type: "SET_PHASE", phase: target.phase });
    dispatch({ type: "SET_STEP", stepIndex: target.stepIndex });
    focusHeading();
  }

  function handleFieldChange(fieldId: string, newText: string, maxWords: number) {
    // Hard cap: reject changes that would exceed the word limit (DOMAIN §8).
    if (countWords(newText) > maxWords) return;
    dispatch({ type: "SET_NARRATIVE_FIELD", exerciseId: exercise!.id, fieldId, text: newText });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main>
      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
            Step {visualStep} of 26
          </span>
          <span
            style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.03em" }}
          >
            Reflection
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={visualStep}
          aria-valuemin={1}
          aria-valuemax={26}
          aria-label={`Step ${visualStep} of 26`}
          style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              width: `${(visualStep / 26) * 100}%`,
              background: "var(--accent-primary)",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Optional badge + heading */}
      <span
        style={{
          display: "inline-block",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--accent-primary)",
          background: "rgba(167, 139, 250, 0.12)",
          borderRadius: 4,
          padding: "2px 8px",
          marginBottom: 12,
        }}
      >
        OPTIONAL
      </span>

      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginTop: 0,
          marginBottom: 12,
          outline: "none",
        }}
      >
        {exercise.title}
      </h2>

      <p
        style={{
          color: "var(--text-secondary)",
          marginTop: 0,
          marginBottom: 28,
          lineHeight: 1.6,
          fontSize: "0.9375rem",
        }}
      >
        {exercise.intro}
      </p>

      {/* Text fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {exercise.fields.map((field) => {
          const text = drafts[field.id] ?? "";
          const wordCount = countWords(text);
          const warningThreshold = Math.floor(field.maxWords * 0.8);
          const atWarning = wordCount >= warningThreshold && wordCount < field.maxWords;
          const atCap = wordCount >= field.maxWords;

          const counterColor = atCap
            ? "var(--danger)"
            : atWarning
              ? "var(--warning)"
              : "var(--text-muted)";

          return (
            <div key={field.id}>
              <label
                htmlFor={`${headingId}-${field.id}`}
                style={{
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {field.label}
              </label>
              <textarea
                id={`${headingId}-${field.id}`}
                value={text}
                onChange={(e) => handleFieldChange(field.id, e.target.value, field.maxWords)}
                rows={4}
                aria-describedby={`${headingId}-${field.id}-count`}
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: `1px solid ${atCap ? "var(--warning)" : "var(--border)"}`,
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6,
                  padding: "12px 14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  minHeight: 100,
                }}
              />
              <div
                id={`${headingId}-${field.id}-count`}
                aria-live="polite"
                style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}
              >
                <span style={{ fontSize: "0.8125rem", color: counterColor }}>
                  {wordCount} / {field.maxWords} words
                  {atCap && <span> — limit reached</span>}
                  {atWarning && <span> — approaching limit</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy notice */}
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          marginTop: 28,
          marginBottom: 0,
          lineHeight: 1.5,
          padding: "10px 14px",
          background: "var(--surface)",
          borderRadius: 6,
          border: "1px solid var(--border)",
        }}
      >
        Your responses are stored only in this browser session and are never sent to our servers
        unless you choose to include an AI analysis.
      </p>

      {/* Navigation */}
      <div
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 28 }}
      >
        <button
          onClick={() => navigate(narrativeBack(stepIndex))}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 24px",
            color: "var(--text-secondary)",
            fontSize: "0.9375rem",
            cursor: "pointer",
            minWidth: 80,
            minHeight: 44,
          }}
        >
          Back
        </button>
        <button
          onClick={() => navigate(narrativeContinue(stepIndex))}
          style={{
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: 8,
            padding: "12px 28px",
            color: "#0d0d1a",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: "pointer",
            minWidth: 120,
            minHeight: 44,
          }}
        >
          Continue
        </button>
        <button
          onClick={() => navigate(narrativeContinue(stepIndex))}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.9375rem",
            cursor: "pointer",
            padding: "12px 8px",
            minHeight: 44,
          }}
        >
          Skip this exercise
        </button>
      </div>
    </main>
  );
}
