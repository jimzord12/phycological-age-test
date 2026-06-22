"use client";

import { useEffect, useRef, useState } from "react";
import { useAssessment } from "@/client/assessment-context";
import type { ScoreResponse } from "@/app/api/v1/assessments/score/route";
import {
  buildExportPayload,
  buildJsonExport,
  buildHtmlExport,
  triggerDownload,
  exportDateStamp,
} from "./_export-helpers";
import {
  DIMENSION_IDS,
  type DimensionId,
  type DimensionResult,
  type ConfidenceReason,
} from "@/domain/result-types";

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  ER: "Emotional Regulation",
  IC: "Impulse Control",
  PT: "Perspective-Taking",
  IS: "Identity Stability",
  TD: "Temporal Depth",
};

export type BandLabel = "Emerging" | "Developing" | "Established" | "Proficient" | "Integrated";

/** Maps a 0–100 dimension score to a descriptive band (DD-6). */
export function getBandLabel(score: number): BandLabel {
  if (score < 25) return "Emerging";
  if (score < 50) return "Developing";
  if (score < 75) return "Established";
  if (score < 90) return "Proficient";
  return "Integrated";
}

export type GrowthAreas = {
  strongest: DimensionId | null;
  /** Bottom 1 (if 2 reportable) or bottom 2 (if 3+ reportable) dimensions. */
  growth: DimensionId[];
};

/** Identifies the highest-scoring and lower-scoring reportable dimensions (DOMAIN §12.3). */
export function getGrowthAreas(
  dimensions: Record<DimensionId, DimensionResult>,
): GrowthAreas {
  const reportable = DIMENSION_IDS.filter((d) => dimensions[d]!.status === "reportable");
  if (reportable.length === 0) return { strongest: null, growth: [] };

  const scored = reportable.map((d) => {
    const r = dimensions[d]! as Extract<DimensionResult, { status: "reportable" }>;
    return { id: d, score: r.score };
  });
  scored.sort((a, b) => b.score - a.score);

  const strongest = scored[0]!.id;
  const growthCount = scored.length >= 3 ? 2 : scored.length === 2 ? 1 : 0;
  const growth = growthCount === 0 ? [] : scored.slice(-growthCount).map((s) => s.id);

  return { strongest, growth };
}

/** Converts a machine-readable confidence reason to human-readable copy. */
export function formatConfidenceReason(reason: ConfidenceReason): string {
  switch (reason.code) {
    case "extra_not_applicable":
      return `${reason.count} extra "Not applicable" response${reason.count === 1 ? "" : "s"} (−${reason.deducted} pts)`;
    case "non_reportable_dimension":
      return `${DIMENSION_LABELS[reason.dimension as DimensionId] ?? reason.dimension} had insufficient answers (−${reason.deducted} pts)`;
    case "low_coverage":
      return `${reason.missingOrNa} item${reason.missingOrNa === 1 ? "" : "s"} unanswered or marked "Not applicable" (−${reason.deducted} pts)`;
    case "inconsistent_pair":
      return `Notably different responses on ${reason.pair[0]} and ${reason.pair[1]} (−${reason.deducted} pts)`;
  }
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Horizontal score bar with accessible text equivalent. */
function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      role="img"
      aria-label={`Score: ${score} out of 100`}
      style={{
        height: 8,
        borderRadius: 4,
        background: "var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 4,
          background: "var(--accent-primary)",
        }}
      />
    </div>
  );
}

function DimensionCard({
  dimId,
  result,
}: {
  dimId: DimensionId;
  result: DimensionResult;
}) {
  const label = DIMENSION_LABELS[dimId];
  if (result.status === "insufficient_data") {
    const needed = result.required - result.answered;
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9375rem" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Insufficient data
          </span>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
          }}
        >
          Answer at least {needed} more item{needed === 1 ? "" : "s"} to generate a score for
          this dimension ({result.answered} of {result.required} required answered so far).
        </p>
      </Card>
    );
  }

  const band = getBandLabel(result.score);
  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9375rem" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)", fontSize: "1rem", marginRight: 6 }}>
            {result.score}
          </strong>
          / 100
        </span>
      </div>
      <ScoreBar score={result.score} />
      <div
        style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--text-secondary)" }}
        aria-label={`Band: ${band}`}
      >
        {band}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ScoreState =
  | { status: "loading" }
  | { status: "success"; data: ScoreResponse }
  | { status: "error"; message: string };

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "var(--success)",
  moderate: "var(--warning)",
  low: "var(--danger)",
};

const BALANCE_COPY: Record<string, string> = {
  relatively_balanced: "Your scores are relatively balanced across dimensions.",
  some_unevenness: "There is some unevenness across your dimension scores.",
  strongly_uneven: "Your scores are strongly uneven across dimensions.",
};

export function ResultsScreen() {
  const { state, dispatch } = useAssessment();
  const [scoreState, setScoreState] = useState<ScoreState>({ status: "loading" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const answers = Object.entries(state.structuredAnswers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    fetch("/api/v1/assessments/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionnaireVersion: state.questionnaireVersion,
        answers,
        preferences: { includeAgeMetaphor: state.preferences.includeAgeMetaphor },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ScoreResponse>;
      })
      .then((data) => setScoreState({ status: "success", data }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        setScoreState({ status: "error", message });
      });
  }, [state]);

  function handleRetry() {
    hasFetched.current = false;
    setScoreState({ status: "loading" });
  }

  function handleStartOver() {
    if (window.confirm("Start a new assessment? Your current answers will be cleared.")) {
      dispatch({ type: "DISCARD", newVersion: state.questionnaireVersion });
    }
  }

  function handleExportJson() {
    if (scoreState.status !== "success") return;
    const payload = buildExportPayload(
      scoreState.data.result,
      state.preferences.includeAgeMetaphor,
    );
    const date = exportDateStamp(payload.exportedAt);
    triggerDownload(buildJsonExport(payload), `maturity-profile-${date}.json`, "application/json");
  }

  function handleExportHtml() {
    if (scoreState.status !== "success") return;
    const payload = buildExportPayload(
      scoreState.data.result,
      state.preferences.includeAgeMetaphor,
    );
    const date = exportDateStamp(payload.exportedAt);
    triggerDownload(buildHtmlExport(payload), `maturity-profile-${date}.html`, "text/html");
  }

  if (scoreState.status === "loading") {
    return (
      <main>
        <p aria-live="polite" aria-busy="true" style={{ color: "var(--text-secondary)" }}>
          Calculating your results…
        </p>
      </main>
    );
  }

  if (scoreState.status === "error") {
    return (
      <main>
        <p role="alert" style={{ color: "var(--danger)", marginBottom: 12 }}>
          Could not calculate results: {scoreState.message}.
        </p>
        <button
          onClick={handleRetry}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 22px",
            color: "var(--text-secondary)",
            fontSize: "0.9375rem",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  const { result } = scoreState.data;
  const { dimensions, structuredMaturityIndex, profileBalance, confidence, ageMetaphor } =
    result;
  const { strongest, growth } = getGrowthAreas(dimensions);

  return (
    <main>
      {/* Non-clinical disclaimer */}
      <p
        role="note"
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          marginBottom: 28,
          padding: "10px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          lineHeight: 1.5,
        }}
      >
        <strong>Not a clinical tool.</strong> This profile reflects self-reported behavior
        patterns in a voluntary assessment. It is not a psychological diagnosis, a measure of
        mental health, or a professional evaluation of any kind.
      </p>

      {/* Page heading */}
      <h1
        ref={headingRef}
        tabIndex={-1}
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginTop: 0,
          marginBottom: 6,
          outline: "none",
        }}
      >
        Your Maturity Profile
      </h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: 36 }}>
        Scoring version: {result.scoringVersion}
      </p>

      {/* Structured Maturity Index */}
      <section aria-label="Structured Maturity Index" style={{ marginBottom: 36 }}>
        <SectionHeading>Structured Maturity Index</SectionHeading>
        <Card>
          {structuredMaturityIndex !== null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span
                aria-label={`Structured Maturity Index: ${structuredMaturityIndex} out of 100`}
                style={{
                  fontSize: "3rem",
                  fontWeight: 800,
                  color: "var(--accent-primary)",
                  lineHeight: 1,
                }}
              >
                {structuredMaturityIndex}
              </span>
              <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>/ 100</span>
              <span
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--text-secondary)",
                  marginLeft: 4,
                }}
              >
                {getBandLabel(structuredMaturityIndex)}
              </span>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  margin: "0 0 6px",
                  fontSize: "0.9375rem",
                }}
              >
                Index unavailable
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                The overall index requires all five dimensions to be reportable. Answer more
                items in the dimensions marked "Insufficient data" below to unlock it.
              </p>
            </>
          )}
        </Card>
      </section>

      {/* Dimension scores */}
      <section aria-label="Dimension scores" style={{ marginBottom: 36 }}>
        <SectionHeading>Dimension Scores</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DIMENSION_IDS.map((d) => (
            <DimensionCard key={d} dimId={d} result={dimensions[d]!} />
          ))}
        </div>
      </section>

      {/* Profile balance */}
      {profileBalance !== null && (
        <section aria-label="Profile balance" style={{ marginBottom: 36 }}>
          <SectionHeading>Profile Balance</SectionHeading>
          <Card>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.9375rem",
              }}
            >
              {BALANCE_COPY[profileBalance.label] ??
                `Profile spread: ${profileBalance.spread} points.`}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
              }}
            >
              Spread across reportable dimensions: {profileBalance.spread} points.
            </p>
          </Card>
        </section>
      )}

      {/* Growth areas */}
      {(strongest !== null || growth.length > 0) && (
        <section aria-label="Areas of strength and development" style={{ marginBottom: 36 }}>
          <SectionHeading>Strength &amp; Development Areas</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {strongest !== null && (
              <Card>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                  Strongest dimension
                </div>
                <div
                  style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9375rem" }}
                >
                  {DIMENSION_LABELS[strongest]}
                </div>
              </Card>
            )}
            {growth.map((d) => (
              <Card key={d}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                  Area for continued development
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontSize: "0.9375rem",
                  }}
                >
                  {DIMENSION_LABELS[d]}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Confidence */}
      <section aria-label="Result confidence" style={{ marginBottom: 36 }}>
        <SectionHeading>Result Confidence</SectionHeading>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: CONFIDENCE_COLOR[confidence.label] ?? "var(--text-secondary)",
                textTransform: "capitalize",
              }}
            >
              {confidence.label}
            </span>
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              ({confidence.score} / 100)
            </span>
          </div>
          {confidence.reasons.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              No factors reduced confidence in these results.
            </p>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                }}
              >
                Factors that reduced confidence:
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {confidence.reasons.map((r, i) => (
                  <li key={i}>{formatConfidenceReason(r as ConfidenceReason)}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>

      {/* Age metaphor (opt-in only, with required qualifying copy) */}
      {state.preferences.includeAgeMetaphor && ageMetaphor !== null && (
        <section aria-label="Maturity age metaphor" style={{ marginBottom: 36 }}>
          <SectionHeading>Age Metaphor</SectionHeading>
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <span
                aria-label={`Maturity age metaphor: ${ageMetaphor}`}
                style={{
                  fontSize: "2.25rem",
                  fontWeight: 800,
                  color: "var(--accent-secondary)",
                  lineHeight: 1,
                }}
              >
                {ageMetaphor}
              </span>
              <span style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
                (metaphorical age)
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              This number is a rough metaphor for the maturity level reflected in your
              responses — it is not your chronological age, a clinical measure, or a literal
              psychological age. The scale runs from 16 to 72 and corresponds to your overall
              index on a continuous range.
            </p>
          </Card>
        </section>
      )}

      {/* AI analysis slot (I011) */}
      <section aria-label="AI analysis" style={{ marginBottom: 36 }}>
        <SectionHeading>AI Analysis</SectionHeading>
        <Card>
          <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--text-muted)" }}>
            {state.preferences.includeAiAnalysis
              ? "AI analysis is not yet available. This section will be filled in once the AI layer is ready (I011)."
              : "You did not opt in to AI analysis. You can start a new assessment and opt in on the consent screen if you wish."}
          </p>
        </Card>
      </section>

      {/* Actions (export slot I009 + start over) */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          paddingTop: 24,
          borderTop: "1px solid var(--border)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleExportJson}
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
          Export JSON
        </button>
        <button
          onClick={handleExportHtml}
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
          Export HTML
        </button>
        <button
          onClick={handleStartOver}
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
          Start a new assessment
        </button>
      </div>
    </main>
  );
}
