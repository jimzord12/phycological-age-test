import { PUBLIC_DISCLAIMER } from "@/domain/questionnaire";
import { QUESTIONNAIRE_VERSION, SCORING_VERSION } from "@/domain/versions";

/**
 * Placeholder landing. The full questionnaire, results, API and AI layers are
 * built in later increments; this increment delivers the deterministic scoring
 * core (see src/domain) with full unit tests.
 */
export default function Home() {
  return (
    <main>
      <h1>Reflective Maturity Profile</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Working title: Psychological Age Test. A privacy-first, reflective self-assessment.
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Questionnaire {QUESTIONNAIRE_VERSION} · Scoring {SCORING_VERSION}
      </p>
      <p style={{ marginTop: 32, color: "var(--text-secondary)" }}>{PUBLIC_DISCLAIMER}</p>
    </main>
  );
}
