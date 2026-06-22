"use client";

import { useAssessment } from "@/client/assessment-context";
import { LandingScreen } from "./_landing-screen";
import { ConsentScreen } from "./_consent-screen";
import { QuestionnaireShell } from "./_questionnaire-shell";

/** Routes to the correct screen based on phase and stepIndex. */
export function HomeFlow() {
  const { state } = useAssessment();

  if (state.phase === "consent") {
    if (state.stepIndex === 0) return <LandingScreen />;
    return <ConsentScreen />;
  }

  if (state.phase === "questionnaire") {
    return <QuestionnaireShell />;
  }

  // Narrative (I006), review (I007), and results (I008) screens come next.
  return (
    <main>
      <h1>Assessment in progress</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {state.phase === "narrative"
          ? "Narrative exercises coming in I006."
          : "Review and results screens coming in I007–I008."}
      </p>
    </main>
  );
}
