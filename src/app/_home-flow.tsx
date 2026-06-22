"use client";

import { useAssessment } from "@/client/assessment-context";
import { LandingScreen } from "./_landing-screen";
import { ConsentScreen } from "./_consent-screen";
import { QuestionnaireShell } from "./_questionnaire-shell";
import { NarrativeShell } from "./_narrative-shell";
import { ReviewScreen } from "./_review-screen";
import { ResultsScreen } from "./_results-screen";

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

  if (state.phase === "narrative") {
    return <NarrativeShell />;
  }

  if (state.phase === "review") {
    return <ReviewScreen />;
  }

  // "submitted" phase → deterministic results (I008).
  return <ResultsScreen />;
}
