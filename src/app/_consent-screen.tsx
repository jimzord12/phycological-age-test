"use client";

import { useId, useState } from "react";
import { useAssessment } from "@/client/assessment-context";

/** Exact AI consent disclosure shown adjacent to the opt-in (PRD §7.2). */
const AI_CONSENT_COPY =
  "Your written exercise responses will be sent to a third-party AI service to generate a " +
  "narrative commentary on your profile. This text is not stored, retained, or used to train " +
  "models. The AI output is supplementary and does not affect or alter your scored results.";

const AGE_METAPHOR_COPY =
  "The age metaphor expresses your scores as a figurative comparison " +
  '("behavioral patterns associated with someone much older/younger in this area"). ' +
  "It is illustrative only — not a literal estimate of psychological or chronological age.";

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "16px 20px 20px",
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  padding: "0 4px",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const checkboxStyle: React.CSSProperties = {
  marginTop: 3,
  width: 16,
  height: 16,
  cursor: "pointer",
  flexShrink: 0,
  accentColor: "var(--accent-primary)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  cursor: "pointer",
  lineHeight: 1.55,
};

const disclosureBoxStyle: React.CSSProperties = {
  marginTop: 10,
  marginLeft: 26,
  padding: "10px 14px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text-muted)",
  fontSize: "0.825rem",
  lineHeight: 1.5,
};

export function ConsentScreen() {
  const { state, dispatch } = useAssessment();
  const [nonClinicalAcknowledged, setNonClinicalAcknowledged] = useState(false);

  const adultId = useId();
  const nonClinicalId = useId();
  const aiId = useId();
  const ageMetaphorId = useId();

  const canContinue = state.consent.eligibilityConfirmed && nonClinicalAcknowledged;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canContinue) return;
    dispatch({ type: "SET_PHASE", phase: "questionnaire" });
    dispatch({ type: "SET_STEP", stepIndex: 0 });
  }

  return (
    <main>
      <h1 style={{ marginBottom: 8 }}>Before you begin</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 28, marginTop: 0 }}>
        Please confirm the following before starting your assessment.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Required confirmations */}
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Required</legend>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id={adultId}
                checked={state.consent.eligibilityConfirmed}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONSENT",
                    patch: { eligibilityConfirmed: e.target.checked },
                  })
                }
                aria-required="true"
                style={checkboxStyle}
              />
              <label htmlFor={adultId} style={labelStyle}>
                I am 18 years of age or older.
              </label>
            </div>

            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id={nonClinicalId}
                checked={nonClinicalAcknowledged}
                onChange={(e) => setNonClinicalAcknowledged(e.target.checked)}
                aria-required="true"
                style={checkboxStyle}
              />
              <label htmlFor={nonClinicalId} style={labelStyle}>
                I understand this is a reflective self-assessment, not a clinical assessment or
                diagnosis.
              </label>
            </div>
          </div>
        </fieldset>

        {/* Optional preferences */}
        <fieldset style={{ ...fieldsetStyle, marginTop: 20 }}>
          <legend style={legendStyle}>Optional</legend>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* AI analysis opt-in */}
            <div>
              <div style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  id={aiId}
                  checked={state.preferences.includeAiAnalysis}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_PREFERENCES",
                      patch: { includeAiAnalysis: e.target.checked },
                    })
                  }
                  style={checkboxStyle}
                />
                <label htmlFor={aiId} style={labelStyle}>
                  Include AI narrative analysis
                </label>
              </div>
              {/* AI consent copy always visible adjacent to the opt-in (PRD §7.2) */}
              <p style={disclosureBoxStyle}>{AI_CONSENT_COPY}</p>
            </div>

            {/* Age metaphor toggle */}
            <div>
              <div style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  id={ageMetaphorId}
                  checked={state.preferences.includeAgeMetaphor}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_PREFERENCES",
                      patch: { includeAgeMetaphor: e.target.checked },
                    })
                  }
                  style={checkboxStyle}
                />
                <label htmlFor={ageMetaphorId} style={labelStyle}>
                  Include age metaphor in results{" "}
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    (off by default)
                  </span>
                </label>
              </div>
              <p style={disclosureBoxStyle}>{AGE_METAPHOR_COPY}</p>
            </div>
          </div>
        </fieldset>

        <p style={{ marginTop: 20, fontSize: "0.875rem", color: "var(--text-muted)" }}>
          <a href="/privacy">Privacy policy</a>
        </p>

        <button
          type="submit"
          disabled={!canContinue}
          aria-disabled={!canContinue}
          style={{
            marginTop: 8,
            background: "var(--accent-primary)",
            color: "#0d0d1a",
            border: "none",
            borderRadius: 8,
            padding: "14px 36px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.4,
            transition: "opacity 0.15s",
          }}
        >
          Continue
        </button>
      </form>
    </main>
  );
}
