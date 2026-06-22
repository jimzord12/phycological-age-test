"use client";

import { useAssessment } from "@/client/assessment-context";
import { LandingScreen } from "./_landing-screen";
import { ConsentScreen } from "./_consent-screen";

/** Routes to the correct screen based on phase and stepIndex. */
export function HomeFlow() {
  const { state } = useAssessment();

  if (state.phase === "consent") {
    if (state.stepIndex === 0) return <LandingScreen />;
    return <ConsentScreen />;
  }

  // Questionnaire, narrative, review, and results screens are built in I005–I008.
  return (
    <main>
      <h1>Assessment in progress</h1>
      <p style={{ color: "var(--text-secondary)" }}>The questionnaire is coming soon.</p>
    </main>
  );
}
