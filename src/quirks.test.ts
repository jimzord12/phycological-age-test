import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRUCTURED_QUESTIONS } from "@/domain/questionnaire";
import { QUESTIONNAIRE_VERSION } from "@/domain/versions";

/**
 * Detector tests for entries in KNOWLEDGE.md.
 *
 * Each test guards one documented quirk. When a quirk no longer holds (e.g. an
 * upstream fix lands, or an intentional config is removed), the matching test
 * fails — a cheap signal that the KNOWLEDGE.md entry can be retired or updated.
 * Keep the `K:` titles in sync with the entries they guard.
 *
 * Not every quirk is cheaply testable; those without a detector say so in
 * KNOWLEDGE.md and must be verified manually.
 */
describe("KNOWLEDGE.md quirk detectors", () => {
  it("K: strict tsconfig flags stay enabled (noUncheckedIndexedAccess, verbatimModuleSyntax)", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(process.cwd(), "tsconfig.json"), "utf8"),
    ) as { compilerOptions: Record<string, unknown> };
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(tsconfig.compilerOptions.verbatimModuleSyntax).toBe(true);
  });

  it('K: option "C" is not uniformly the highest-scoring option in the bank', () => {
    const everyMaxIsC = STRUCTURED_QUESTIONS.every((q) => {
      const scores = q.options
        .filter((o) => o.score !== null)
        .map((o) => ({ id: o.id, score: o.score as number }));
      const max = Math.max(...scores.map((s) => s.score));
      return scores.find((s) => s.id === "C")?.score === max;
    });
    // If this ever flips to true ("C is always best"), the bank changed —
    // update the KNOWLEDGE.md entry and any fixtures that relied on the quirk.
    expect(everyMaxIsC).toBe(false);
  });

  it("K: vitest runs in a DOM-less (node) environment", () => {
    expect(typeof document).toBe("undefined");
  });

  it("K: the @/ path alias resolves under vitest", () => {
    // The top-of-file `@/domain/...` imports already exercise the alias at
    // collection time; this asserts the imported value to make the guard explicit.
    expect(QUESTIONNAIRE_VERSION).toBe("RMP-1.0");
  });
});
