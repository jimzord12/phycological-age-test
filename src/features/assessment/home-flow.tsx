"use client";

import { useAssessment } from "@/client/assessment-context";
import { LandingScreen } from "./screens/landing-screen";
import { ConsentScreen } from "./screens/consent-screen";
import { QuestionnaireShell } from "./questionnaire/questionnaire-shell";
import { NarrativeShell } from "./questionnaire/narrative-shell";
import { ReviewScreen } from "./questionnaire/review-screen";
import { ResultsScreen } from "./results/results-screen";

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
