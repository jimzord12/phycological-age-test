import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  buildExportPayload,
  buildJsonExport,
  buildHtmlExport,
  exportDateStamp,
} from "./_export-helpers";
import type { ScoreResponse } from "@/app/api/v1/assessments/score/route";
import { QUESTIONNAIRE_VERSION } from "@/domain/versions";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<ScoreResponse["result"]> = {},
): ScoreResponse["result"] {
  return {
    scoringVersion: "RMP-SCORE-1.0",
    dimensions: {
      ER: { status: "reportable", score: 70, answered: 5, available: 5 },
      IC: { status: "reportable", score: 55, answered: 5, available: 5 },
      PT: { status: "reportable", score: 80, answered: 5, available: 5 },
      IS: { status: "reportable", score: 65, answered: 4, available: 4 },
      TD: { status: "reportable", score: 45, answered: 5, available: 5 },
    },
    structuredMaturityIndex: 63,
    profileBalance: { label: "relatively_balanced", spread: 35 },
    confidence: { score: 90, label: "high", reasons: [] },
    ageMetaphor: 38,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double-quote", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single-quote", () => {
    expect(escapeHtml("it's fine")).toBe("it&#x27;s fine");
  });

  it("leaves clean text unchanged", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });

  it("handles all XSS chars in one string", () => {
    const out = escapeHtml(`<img src=x onerror="alert('xss')">`);
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain('"');
    expect(out).not.toContain("'");
  });
});

// ---------------------------------------------------------------------------
// exportDateStamp
// ---------------------------------------------------------------------------

describe("exportDateStamp", () => {
  it("extracts the date portion from an ISO timestamp", () => {
    expect(exportDateStamp("2026-06-22T14:30:00.000Z")).toBe("2026-06-22");
  });
});

// ---------------------------------------------------------------------------
// buildExportPayload
// ---------------------------------------------------------------------------

describe("buildExportPayload", () => {
  it("includes the questionnaire version constant", () => {
    const payload = buildExportPayload(makeResult(), false);
    expect(payload.questionnaireVersion).toBe(QUESTIONNAIRE_VERSION);
  });

  it("includes the scoring version from the result", () => {
    const payload = buildExportPayload(makeResult(), false);
    expect(payload.scoringVersion).toBe("RMP-SCORE-1.0");
  });

  it("includes the non-clinical disclaimer", () => {
    const payload = buildExportPayload(makeResult(), false);
    expect(payload.disclaimer).toMatch(/Not a clinical tool/);
  });

  it("sets ageMetaphor when includeAgeMetaphor is true and result has a value", () => {
    const payload = buildExportPayload(makeResult({ ageMetaphor: 38 }), true);
    expect(payload.ageMetaphor).toBe(38);
  });

  it("sets ageMetaphor to null when includeAgeMetaphor is false", () => {
    const payload = buildExportPayload(makeResult({ ageMetaphor: 38 }), false);
    expect(payload.ageMetaphor).toBeNull();
  });

  it("sets ageMetaphor to null when result.ageMetaphor is null even if opted in", () => {
    const payload = buildExportPayload(makeResult({ ageMetaphor: null }), true);
    expect(payload.ageMetaphor).toBeNull();
  });

  it("adds band labels to reportable dimensions", () => {
    const payload = buildExportPayload(makeResult(), false);
    const er = payload.dimensions.ER;
    expect(er.status).toBe("reportable");
    if (er.status === "reportable") {
      expect(er.band).toBe("Established"); // score 70 → Established
    }
  });

  it("preserves insufficient_data dimensions", () => {
    const result = makeResult({
      dimensions: {
        ER: { status: "insufficient_data", answered: 2, required: 4, available: 5 },
        IC: { status: "reportable", score: 50, answered: 5, available: 5 },
        PT: { status: "reportable", score: 50, answered: 5, available: 5 },
        IS: { status: "reportable", score: 50, answered: 4, available: 4 },
        TD: { status: "reportable", score: 50, answered: 5, available: 5 },
      },
    });
    const payload = buildExportPayload(result, false);
    expect(payload.dimensions.ER.status).toBe("insufficient_data");
  });

  it("converts confidence reasons to human-readable strings", () => {
    const result = makeResult({
      confidence: {
        score: 70,
        label: "moderate",
        reasons: [{ code: "low_coverage", missingOrNa: 3, deducted: 15 }],
      },
    });
    const payload = buildExportPayload(result, false);
    expect(payload.confidence.reasons[0]).toContain("3 items");
    expect(payload.confidence.reasons[0]).toContain("−15 pts");
  });

  it("exportedAt is a non-empty ISO timestamp string", () => {
    const payload = buildExportPayload(makeResult(), false);
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ---------------------------------------------------------------------------
// buildJsonExport
// ---------------------------------------------------------------------------

describe("buildJsonExport", () => {
  it("returns valid JSON", () => {
    const payload = buildExportPayload(makeResult(), false);
    expect(() => JSON.parse(buildJsonExport(payload))).not.toThrow();
  });

  it("parsed JSON contains questionnaire version", () => {
    const payload = buildExportPayload(makeResult(), false);
    const parsed = JSON.parse(buildJsonExport(payload)) as Record<string, unknown>;
    expect(parsed["questionnaireVersion"]).toBe(QUESTIONNAIRE_VERSION);
  });

  it("parsed JSON contains disclaimer", () => {
    const payload = buildExportPayload(makeResult(), false);
    const parsed = JSON.parse(buildJsonExport(payload)) as Record<string, unknown>;
    expect(typeof parsed["disclaimer"]).toBe("string");
    expect((parsed["disclaimer"] as string).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildHtmlExport
// ---------------------------------------------------------------------------

describe("buildHtmlExport", () => {
  it("is a well-formed HTML5 document", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("contains the non-clinical disclaimer", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("Not a clinical tool");
  });

  it("contains the questionnaire version", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain(QUESTIONNAIRE_VERSION);
  });

  it("contains the scoring version", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("RMP-SCORE-1.0");
  });

  it("contains the export timestamp", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain(payload.exportedAt);
  });

  it("includes @media print rule", () => {
    const payload = buildExportPayload(makeResult(), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("@media print");
  });

  it("shows SMI number when present", () => {
    const payload = buildExportPayload(makeResult({ structuredMaturityIndex: 63 }), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("63");
  });

  it("shows Index unavailable when SMI is null", () => {
    const payload = buildExportPayload(makeResult({ structuredMaturityIndex: null }), false);
    const html = buildHtmlExport(payload);
    expect(html).toContain("Index unavailable");
  });

  it("shows age metaphor section when ageMetaphor is not null", () => {
    const payload = buildExportPayload(makeResult({ ageMetaphor: 38 }), true);
    const html = buildHtmlExport(payload);
    expect(html).toContain("Age Metaphor");
    expect(html).toContain("38");
  });

  it("omits age metaphor section when ageMetaphor is null", () => {
    const payload = buildExportPayload(makeResult(), false); // includeAgeMetaphor=false → null
    const html = buildHtmlExport(payload);
    expect(html).not.toContain("Age Metaphor");
  });

  it("properly escapes HTML special characters in dynamic content", () => {
    // scoringVersion is a controlled string, but escapeHtml is called on it
    const payload = buildExportPayload(makeResult(), false);
    // Inject a synthetic test via a payload override to verify escaping path
    const malicious = { ...payload, scoringVersion: '<script>alert("xss")</script>' };
    const html = buildHtmlExport(malicious);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
