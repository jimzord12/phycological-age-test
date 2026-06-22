"use client";

import { useAssessment } from "@/client/assessment-context";
import { PUBLIC_DISCLAIMER } from "@/domain/questionnaire";
import { VersionMismatchBanner } from "./version-mismatch-banner";

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "var(--accent-primary)",
  color: "#0d0d1a",
  border: "none",
  borderRadius: 8,
  padding: "14px 36px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

export function LandingScreen() {
  const { dispatch, versionMismatch, discardMismatchedDraft, exportMismatchedDraft } =
    useAssessment();

  return (
    <main>
      {versionMismatch && (
        <VersionMismatchBanner
          mismatch={versionMismatch}
          onDiscard={discardMismatchedDraft}
          onExport={exportMismatchedDraft}
        />
      )}

      <header style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: "2rem", marginBottom: 10 }}>Reflective Maturity Profile</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", margin: 0 }}>
          A private, reflective self-assessment of behavioral maturity patterns.
        </p>
      </header>

      <section
        aria-label="Assessment overview"
        style={{ marginBottom: 28, display: "flex", gap: 24, flexWrap: "wrap" }}
      >
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>10–15 minutes</span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          24 multiple-choice questions + 2 written exercises
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          No account required
        </span>
      </section>

      <section
        aria-label="Privacy summary"
        style={{
          marginBottom: 28,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>Privacy:</strong> Your answers are never
          sent to a server unless you explicitly opt in to AI analysis. Scoring is computed entirely
          on this device. No ads, no tracking, no persistent storage.
        </p>
      </section>

      <details style={{ marginBottom: 28 }}>
        <summary
          style={{
            cursor: "pointer",
            color: "var(--accent-secondary)",
            fontSize: "0.9rem",
            userSelect: "none",
          }}
        >
          How scoring works
        </summary>
        <div
          style={{
            marginTop: 12,
            padding: "16px 20px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <p style={{ marginTop: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Answers are scored across five behavioral dimensions. Two short written exercises
            contribute a separate Narrative Self-Awareness score.
          </p>
          <ul
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              paddingLeft: 20,
              marginBottom: 12,
            }}
          >
            <li>
              <strong>Emotional Regulation (ER)</strong> — identifying and managing emotional
              responses
            </li>
            <li>
              <strong>Impulse Control (IC)</strong> — pausing and reflecting before acting
            </li>
            <li>
              <strong>Perspective Taking (PT)</strong> — considering others&apos; viewpoints
            </li>
            <li>
              <strong>Identity Stability (IS)</strong> — consistency and groundedness of
              self-concept
            </li>
            <li>
              <strong>Temporal Depth (TD)</strong> — balancing present experience with future
              planning
            </li>
            <li>
              <strong>Narrative Self-Awareness (NSA)</strong> — scored from written responses
            </li>
          </ul>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Results are deterministic — the same answers always produce the same scores. Dimensions
            with too few answered questions are reported as insufficient data, not penalized.
          </p>
        </div>
      </details>

      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 32 }}>
        {PUBLIC_DISCLAIMER}
      </p>

      <button
        onClick={() => dispatch({ type: "SET_STEP", stepIndex: 1 })}
        style={primaryButtonStyle}
      >
        Start assessment
      </button>
    </main>
  );
}
