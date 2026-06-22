"use client";

import { useRef, useId } from "react";
import { useAssessment } from "@/client/assessment-context";
import { useQuestionnaire } from "@/client/use-questionnaire";
import type { AssessmentPhase } from "@/client/assessment-state";

// ---------------------------------------------------------------------------
// Dimension display names (no score direction — DOMAIN §14)
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<string, string> = {
  ER: "Emotional Regulation",
  IC: "Impulse Control",
  PT: "Perspective-Taking",
  IS: "Identity Stability",
  TD: "Temporal Depth",
};

// ---------------------------------------------------------------------------
// Pure navigation helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export type NavigationTarget = {
  phase: AssessmentPhase;
  stepIndex: number;
};

/**
 * Maps structured question index (0–23) to the visual step number in the full
 * 26-step flow (24 structured + 2 narrative exercises at steps 9 and 16).
 */
export function toVisualStep(questionIndex: number): number {
  if (questionIndex < 8) return questionIndex + 1; // steps 1–8
  if (questionIndex < 14) return questionIndex + 2; // steps 10–15 (step 9 = N01)
  return questionIndex + 3; // steps 17–26 (steps 9, 16 = N01, N02)
}

/**
 * Returns the navigation target when the user presses Continue on a given
 * structured question (stepIndex 0–23).
 *
 * Narrative hooks fire after items 8 and 14 (DOMAIN §6.3).
 */
export function nextOnContinue(stepIndex: number): NavigationTarget {
  const next = stepIndex + 1;
  if (next === 8) return { phase: "narrative", stepIndex: 0 };
  if (next === 14) return { phase: "narrative", stepIndex: 1 };
  if (next >= 24) return { phase: "review", stepIndex: 0 };
  return { phase: "questionnaire", stepIndex: next };
}

/**
 * Returns the navigation target when the user presses Back on a given
 * structured question (stepIndex 0–23).
 */
export function nextOnBack(stepIndex: number): NavigationTarget {
  if (stepIndex === 0) return { phase: "consent", stepIndex: 1 };
  if (stepIndex === 8) return { phase: "narrative", stepIndex: 0 };
  if (stepIndex === 14) return { phase: "narrative", stepIndex: 1 };
  return { phase: "questionnaire", stepIndex: stepIndex - 1 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionnaireShell() {
  const { state, dispatch } = useAssessment();
  const { questionnaire, isLoading, isError, error } = useQuestionnaire();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const radioGroupId = useId();

  const stepIndex = state.stepIndex;

  function focusHeading() {
    setTimeout(() => headingRef.current?.focus(), 0);
  }

  function navigate(target: NavigationTarget) {
    dispatch({ type: "SET_PHASE", phase: target.phase });
    dispatch({ type: "SET_STEP", stepIndex: target.stepIndex });
    focusHeading();
  }

  // --- Loading / error states -----------------------------------------------

  if (isLoading) {
    return (
      <main>
        <p aria-live="polite" aria-busy="true" style={{ color: "var(--text-secondary)" }}>
          Loading assessment…
        </p>
      </main>
    );
  }

  if (isError || !questionnaire) {
    return (
      <main>
        <p role="alert" style={{ color: "var(--danger)" }}>
          Failed to load the questionnaire{error ? `: ${error}` : "."}{" "}
          <button
            onClick={() => window.location.reload()}
            style={{
              color: "var(--accent-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              font: "inherit",
            }}
          >
            Reload page
          </button>
        </p>
      </main>
    );
  }

  const question = questionnaire.structured[stepIndex];
  if (!question) return null; // guard: stepIndex should always be 0–23 in questionnaire phase

  const selectedOptionId = state.structuredAnswers[question.id] ?? null;
  const canContinue = selectedOptionId !== null;
  const visualStep = toVisualStep(stepIndex);
  const dimensionLabel = DIMENSION_LABELS[question.dimension] ?? question.dimension;
  const isLastQuestion = stepIndex === 23;

  function handleOptionChange(optionId: string) {
    dispatch({ type: "SET_ANSWER", questionId: question!.id, optionId });
  }

  function handleExit() {
    if (!window.confirm("Exit and delete all current answers? This cannot be undone.")) return;
    dispatch({ type: "DISCARD", newVersion: questionnaire!.questionnaireVersion });
  }

  // --- Render ---------------------------------------------------------------

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
            style={{
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              letterSpacing: "0.03em",
            }}
          >
            {dimensionLabel}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={visualStep}
          aria-valuemin={1}
          aria-valuemax={26}
          aria-label={`Step ${visualStep} of 26`}
          style={{
            height: 4,
            background: "var(--border)",
            borderRadius: 2,
            overflow: "hidden",
          }}
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

      {/* Question heading — focus target after navigation */}
      <h2
        ref={headingRef}
        id={radioGroupId}
        tabIndex={-1}
        style={{
          fontSize: "1.125rem",
          lineHeight: 1.6,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginTop: 0,
          marginBottom: 24,
          outline: "none",
        }}
      >
        {question.prompt}
      </h2>

      {/* Radio group — labeled by the question heading above */}
      <div
        role="radiogroup"
        aria-labelledby={radioGroupId}
        style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}
      >
        {question.options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          const isNA = option.isNotApplicable === true;
          return (
            <label
              key={option.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${isSelected ? "var(--accent-primary)" : "var(--border)"}`,
                background: isSelected ? "rgba(167, 139, 250, 0.08)" : "var(--surface)",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                opacity: isNA ? 0.75 : 1,
              }}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => handleOptionChange(option.id)}
                style={{
                  marginTop: 3,
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  accentColor: "var(--accent-primary)",
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  color: isNA ? "var(--text-muted)" : "var(--text-primary)",
                  lineHeight: 1.5,
                  fontSize: "0.9375rem",
                }}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate(nextOnBack(stepIndex))}
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
          onClick={() => navigate(nextOnContinue(stepIndex))}
          disabled={!canContinue}
          aria-disabled={!canContinue}
          style={{
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: 8,
            padding: "12px 28px",
            color: "#0d0d1a",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.4,
            transition: "opacity 0.15s",
            minWidth: 120,
            minHeight: 44,
          }}
        >
          {isLastQuestion ? "Finish questions" : "Continue"}
        </button>
      </div>

      {/* Exit and delete */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={handleExit}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.8125rem",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Exit and delete current answers
        </button>
      </div>
    </main>
  );
}
