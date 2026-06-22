"use client";

import { useRef } from "react";
import { useAssessment } from "@/client/assessment-context";
import { useQuestionnaire } from "@/client/use-questionnaire";
import { NARRATIVE_EXERCISES } from "@/domain/questionnaire";
import { countWords } from "@/domain/narrative-rubric";
import { DIMENSION_IDS } from "@/domain/result-types";
import type { DimensionId } from "@/domain/result-types";
import type { NarrativeDrafts } from "@/client/assessment-state";
import type { NarrativeExercise } from "@/domain/questionnaire";

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export type NarrativeStatus = "complete" | "partial" | "skipped";

export function getNarrativeStatus(
  exercise: NarrativeExercise,
  drafts: NarrativeDrafts,
): NarrativeStatus {
  const exerciseDrafts = drafts[exercise.id] ?? {};
  const totalWords = exercise.fields.reduce((sum, field) => {
    return sum + countWords(exerciseDrafts[field.id] ?? "");
  }, 0);
  if (totalWords === 0) return "skipped";
  if (totalWords >= exercise.minimumTotalWords) return "complete";
  return "partial";
}

export type QuestionStatus = "answered" | "na" | "unanswered";

export function getQuestionStatus(
  questionId: string,
  answers: Record<string, string>,
): QuestionStatus {
  const optionId = answers[questionId];
  if (optionId === undefined) return "unanswered";
  if (optionId === "NA") return "na";
  return "answered";
}

export type DimensionSummary = {
  answered: number;
  na: number;
  unanswered: number;
  total: number;
};

export function getDimensionSummary(
  questions: readonly { id: string }[],
  answers: Record<string, string>,
): DimensionSummary {
  let answered = 0;
  let na = 0;
  let unanswered = 0;
  for (const q of questions) {
    const status = getQuestionStatus(q.id, answers);
    if (status === "answered") answered++;
    else if (status === "na") na++;
    else unanswered++;
  }
  return { answered, na, unanswered, total: questions.length };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<DimensionId, string> = {
  ER: "Emotional Regulation",
  IC: "Impulse Control",
  PT: "Perspective-Taking",
  IS: "Identity Stability",
  TD: "Temporal Depth",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewScreen() {
  const { state, dispatch } = useAssessment();
  const { questionnaire, isLoading, isError, error } = useQuestionnaire();
  const headingRef = useRef<HTMLHeadingElement>(null);

  function focusHeading() {
    setTimeout(() => headingRef.current?.focus(), 0);
  }

  function handleBack() {
    dispatch({ type: "SET_PHASE", phase: "narrative" });
    dispatch({ type: "SET_STEP", stepIndex: 1 });
    focusHeading();
  }

  function handleSubmit() {
    dispatch({ type: "SET_PHASE", phase: "submitted" });
    focusHeading();
  }

  function jumpToQuestion(questionIndex: number) {
    dispatch({ type: "SET_PHASE", phase: "questionnaire" });
    dispatch({ type: "SET_STEP", stepIndex: questionIndex });
  }

  function jumpToNarrative(narrativeIndex: number) {
    dispatch({ type: "SET_PHASE", phase: "narrative" });
    dispatch({ type: "SET_STEP", stepIndex: narrativeIndex });
  }

  if (isLoading) {
    return (
      <main>
        <p aria-live="polite" aria-busy="true" style={{ color: "var(--text-secondary)" }}>
          Loading…
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

  // Group questions by dimension, preserving global index for jump navigation.
  const byDimension: Record<
    DimensionId,
    Array<{ index: number; question: (typeof questionnaire.structured)[number] }>
  > = { ER: [], IC: [], PT: [], IS: [], TD: [] };

  questionnaire.structured.forEach((question, index) => {
    const dim = question.dimension as DimensionId;
    byDimension[dim].push({ index, question });
  });

  const totalAnswered = questionnaire.structured.filter(
    (q) => state.structuredAnswers[q.id] !== undefined,
  ).length;
  const totalQuestions = questionnaire.structured.length;
  const allStructuredAnswered = totalAnswered === totalQuestions;

  return (
    <main>
      <h1
        ref={headingRef}
        tabIndex={-1}
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginTop: 0,
          marginBottom: 8,
          outline: "none",
        }}
      >
        Review your assessment
      </h1>
      <p
        style={{
          color: "var(--text-secondary)",
          marginTop: 0,
          marginBottom: 36,
          lineHeight: 1.6,
          fontSize: "0.9375rem",
        }}
      >
        {allStructuredAnswered
          ? "All questions answered. Review below before submitting."
          : `${totalAnswered} of ${totalQuestions} questions answered — you can go back to complete any item, or submit now.`}
      </p>

      {/* Structured questions by dimension */}
      <section aria-label="Structured questions">
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DIMENSION_IDS.map((dim) => {
            const items = byDimension[dim];
            const summary = getDimensionSummary(
              items.map((i) => ({ id: i.question.id })),
              state.structuredAnswers,
            );
            const completedCount = summary.answered + summary.na;
            const allDimAnswered = summary.unanswered === 0;

            return (
              <div
                key={dim}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${allDimAnswered ? "var(--border)" : "rgba(251, 191, 36, 0.3)"}`,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {/* Dimension header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.025)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontSize: "0.9375rem",
                    }}
                  >
                    {DIMENSION_LABELS[dim]}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: allDimAnswered ? "var(--success)" : "var(--warning)",
                    }}
                    aria-label={`${completedCount} of ${summary.total} answered${summary.na > 0 ? `, ${summary.na} not applicable` : ""}`}
                  >
                    {completedCount} / {summary.total}
                    {summary.na > 0 && ` (${summary.na} N/A)`}
                  </span>
                </div>

                {/* Individual questions */}
                <div>
                  {items.map(({ index, question }, i) => {
                    const status = getQuestionStatus(question.id, state.structuredAnswers);
                    const isLast = i === items.length - 1;
                    const statusColor =
                      status === "answered"
                        ? "var(--success)"
                        : status === "na"
                          ? "var(--text-muted)"
                          : "var(--warning)";
                    const statusLabel =
                      status === "answered" ? "Answered" : status === "na" ? "N/A" : "Unanswered";

                    return (
                      <div
                        key={question.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          padding: "9px 16px",
                          borderBottom: isLast ? "none" : "1px solid var(--border)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              fontFamily: "monospace",
                              marginRight: 8,
                            }}
                          >
                            {question.id}
                          </span>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {question.prompt.length > 72
                              ? question.prompt.slice(0, 72) + "…"
                              : question.prompt}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: statusColor,
                              minWidth: 68,
                              textAlign: "right",
                            }}
                          >
                            {statusLabel}
                          </span>
                          <button
                            onClick={() => jumpToQuestion(index)}
                            aria-label={`Edit question ${question.id}`}
                            style={{
                              background: "none",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "3px 10px",
                              color: "var(--text-secondary)",
                              fontSize: "0.8125rem",
                              cursor: "pointer",
                              minHeight: 28,
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Narrative exercises */}
      <section aria-label="Reflection exercises" style={{ marginTop: 28 }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Reflection Exercises
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {NARRATIVE_EXERCISES.map((exercise, idx) => {
            const status = getNarrativeStatus(exercise, state.narrativeDrafts);
            const statusColor =
              status === "complete"
                ? "var(--success)"
                : status === "partial"
                  ? "var(--warning)"
                  : "var(--text-muted)";
            const statusLabel =
              status === "complete"
                ? "Complete"
                : status === "partial"
                  ? "Partial — below minimum length"
                  : "Skipped";

            return (
              <div
                key={exercise.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontSize: "0.9375rem",
                    }}
                  >
                    {exercise.title}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: statusColor, marginTop: 2 }}>
                    {statusLabel}
                  </div>
                </div>
                <button
                  onClick={() => jumpToNarrative(idx)}
                  aria-label={`Edit ${exercise.title}`}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "var(--text-secondary)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    minHeight: 32,
                    flexShrink: 0,
                  }}
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Choices summary */}
      <section aria-label="Assessment choices" style={{ marginTop: 28 }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Your choices
        </h2>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              AI analysis
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "0.9375rem" }}>
              {state.preferences.includeAiAnalysis ? "Opted in" : "Not included"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              Age metaphor
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "0.9375rem" }}>
              {state.preferences.includeAgeMetaphor ? "Opted in" : "Not included"}
            </span>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 40,
          paddingTop: 24,
          borderTop: "1px solid var(--border)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 24px",
            color: "var(--text-secondary)",
            fontSize: "0.9375rem",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          style={{
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: 8,
            padding: "12px 32px",
            color: "#0d0d1a",
            fontSize: "0.9375rem",
            fontWeight: 700,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Submit assessment
        </button>
      </div>
    </main>
  );
}
