import type { ScoreResponse } from "@/app/api/v1/assessments/score/route";
import type { ConfidenceReason, DimensionId } from "@/domain/result-types";
import { DIMENSION_IDS } from "@/domain/result-types";
import { QUESTIONNAIRE_VERSION } from "@/domain/versions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISCLAIMER =
  "Not a clinical tool. This profile reflects self-reported behavior patterns in a " +
  "voluntary assessment. It is not a psychological diagnosis, a measure of mental " +
  "health, or a professional evaluation of any kind.";

const DIM_LABELS: Record<DimensionId, string> = {
  ER: "Emotional Regulation",
  IC: "Impulse Control",
  PT: "Perspective-Taking",
  IS: "Identity Stability",
  TD: "Temporal Depth",
};

const BALANCE_COPY: Record<string, string> = {
  relatively_balanced: "Your scores are relatively balanced across dimensions.",
  some_unevenness: "There is some unevenness across your dimension scores.",
  strongly_uneven: "Your scores are strongly uneven across dimensions.",
};

// ---------------------------------------------------------------------------
// Internal helpers (private to this module)
// ---------------------------------------------------------------------------

function dimBand(score: number): string {
  if (score < 25) return "Emerging";
  if (score < 50) return "Developing";
  if (score < 75) return "Established";
  if (score < 90) return "Proficient";
  return "Integrated";
}

function reasonText(r: ConfidenceReason): string {
  switch (r.code) {
    case "extra_not_applicable":
      return `${r.count} extra "Not applicable" response${r.count === 1 ? "" : "s"} (−${r.deducted} pts)`;
    case "non_reportable_dimension":
      return `${DIM_LABELS[r.dimension as DimensionId] ?? r.dimension} had insufficient answers (−${r.deducted} pts)`;
    case "low_coverage":
      return `${r.missingOrNa} item${r.missingOrNa === 1 ? "" : "s"} unanswered or marked "Not applicable" (−${r.deducted} pts)`;
    case "inconsistent_pair":
      return `Notably different responses on ${r.pair[0]} and ${r.pair[1]} (−${r.deducted} pts)`;
  }
}

// ---------------------------------------------------------------------------
// Export payload type
// ---------------------------------------------------------------------------

export type DimensionExport =
  | { status: "reportable"; score: number; band: string; answered: number; available: number }
  | { status: "insufficient_data"; answered: number; required: number; available: number };

export type ExportPayload = {
  exportedAt: string;
  questionnaireVersion: string;
  scoringVersion: string;
  disclaimer: string;
  structuredMaturityIndex: number | null;
  dimensions: Record<DimensionId, DimensionExport>;
  profileBalance: { label: string; spread: number } | null;
  confidence: { score: number; label: string; reasons: string[] };
  ageMetaphor: number | null;
};

// ---------------------------------------------------------------------------
// Exported pure functions (testable)
// ---------------------------------------------------------------------------

/** Escapes a string for safe HTML text content and attribute values. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Assembles a flat, human-readable export payload from the score API result. */
export function buildExportPayload(
  result: ScoreResponse["result"],
  includeAgeMetaphor: boolean,
): ExportPayload {
  const dimensions = {} as Record<DimensionId, DimensionExport>;
  for (const d of DIMENSION_IDS) {
    const r = result.dimensions[d]!;
    if (r.status === "reportable") {
      dimensions[d] = {
        status: "reportable",
        score: r.score,
        band: dimBand(r.score),
        answered: r.answered,
        available: r.available,
      };
    } else {
      dimensions[d] = {
        status: "insufficient_data",
        answered: r.answered,
        required: r.required,
        available: r.available,
      };
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    scoringVersion: result.scoringVersion,
    disclaimer: DISCLAIMER,
    structuredMaturityIndex: result.structuredMaturityIndex,
    dimensions,
    profileBalance: result.profileBalance,
    confidence: {
      score: result.confidence.score,
      label: result.confidence.label,
      reasons: result.confidence.reasons.map((r) => reasonText(r as ConfidenceReason)),
    },
    ageMetaphor: includeAgeMetaphor ? result.ageMetaphor : null,
  };
}

/** Returns a pretty-printed JSON string of the export payload. */
export function buildJsonExport(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** Returns a self-contained, print-safe HTML document of the maturity profile. */
export function buildHtmlExport(payload: ExportPayload): string {
  const {
    exportedAt,
    questionnaireVersion,
    scoringVersion,
    disclaimer,
    structuredMaturityIndex,
    dimensions,
    profileBalance,
    confidence,
    ageMetaphor,
  } = payload;

  const dimCards = DIMENSION_IDS.map((d) => {
    const dim = dimensions[d]!;
    const label = escapeHtml(DIM_LABELS[d] ?? d);
    if (dim.status === "reportable") {
      const barPct = Math.max(0, Math.min(100, dim.score));
      return `<div class="card">
  <div class="row"><span class="dim-label">${label}</span><span class="muted">${dim.score}&thinsp;/&thinsp;100</span></div>
  <div class="bar-track"><div class="bar-fill" style="width:${barPct}%"></div></div>
  <div class="band">${escapeHtml(dim.band)}</div>
</div>`;
    }
    const needed = dim.required - dim.answered;
    return `<div class="card">
  <div class="row"><span class="dim-label">${label}</span><span class="muted">Insufficient data</span></div>
  <p class="small muted">Answer at least ${needed} more item${needed === 1 ? "" : "s"} to generate a score for this dimension (${dim.answered}&thinsp;/&thinsp;${dim.required} required).</p>
</div>`;
  }).join("\n");

  const smiContent =
    structuredMaturityIndex !== null
      ? `<div class="smi-wrap"><span class="smi-num">${structuredMaturityIndex}</span><span class="muted">&thinsp;/&thinsp;100</span></div>`
      : `<p>Index unavailable &mdash; not all five dimensions have sufficient answers.</p>`;

  const balanceSection = profileBalance
    ? `<section>
<h2>Profile Balance</h2>
<div class="card">
  <p>${escapeHtml(BALANCE_COPY[profileBalance.label] ?? `Profile spread: ${profileBalance.spread} points.`)}</p>
  <p class="small muted">Spread across reportable dimensions: ${profileBalance.spread} points.</p>
</div>
</section>`
    : "";

  const reasonItems =
    confidence.reasons.length > 0
      ? `<ul>${confidence.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
      : `<p class="small">No factors reduced confidence in these results.</p>`;

  const ageSection =
    ageMetaphor !== null
      ? `<section>
<h2>Age Metaphor</h2>
<div class="card">
  <div class="age-num">${ageMetaphor}</div>
  <p class="small muted">This number is a rough metaphor for the maturity level reflected in your responses &mdash; it is not your chronological age, a clinical measure, or a literal psychological age. The scale runs from 16 to 72.</p>
</div>
</section>`
      : "";

  const css = `
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;margin:0;padding:0;background:#f8f8fc;color:#1a1a2e}
main{max-width:760px;margin:0 auto;padding:48px 16px}
h1{font-size:1.5rem;font-weight:700;margin:0 0 6px}
h2{font-size:.75rem;font-weight:700;letter-spacing:.08em;color:#777;text-transform:uppercase;margin:0 0 12px}
section{margin-bottom:36px}
.card{background:#fff;border:1px solid #e2e2ef;border-radius:10px;padding:16px 20px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.dim-label{font-weight:600}
.bar-track{height:8px;border-radius:4px;background:#e2e2ef;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;background:#7c3aed}
.band,.small{font-size:.8125rem;margin-top:6px;color:#555}
.muted{color:#888}
.smi-wrap{display:flex;align-items:baseline;gap:10px}
.smi-num{font-size:3rem;font-weight:800;color:#7c3aed;line-height:1}
.age-num{font-size:2.25rem;font-weight:800;color:#2563eb;line-height:1;margin-bottom:8px}
.disclaimer{font-size:.8125rem;color:#555;padding:10px 14px;background:#fff;border:1px solid #e2e2ef;border-radius:8px;margin-bottom:28px}
.version{color:#777;margin:0 0 36px}
.confidence-label{font-weight:700;text-transform:capitalize}
footer{margin-top:48px;padding-top:20px;border-top:1px solid #e2e2ef;font-size:.8125rem;color:#888}
@media print{body{background:#fff!important}}
`.trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your Maturity Profile</title>
<style>${css}</style>
</head>
<body>
<main>
<p class="disclaimer"><strong>Not a clinical tool.</strong> ${escapeHtml(disclaimer.replace("Not a clinical tool. ", ""))}</p>
<h1>Your Maturity Profile</h1>
<p class="version">Scoring version: ${escapeHtml(scoringVersion)}</p>
<section>
<h2>Structured Maturity Index</h2>
<div class="card">${smiContent}</div>
</section>
<section>
<h2>Dimension Scores</h2>
${dimCards}
</section>
${balanceSection}
<section>
<h2>Result Confidence</h2>
<div class="card">
  <p><span class="confidence-label">${escapeHtml(confidence.label)}</span> (${confidence.score}&thinsp;/&thinsp;100)</p>
  ${reasonItems}
</div>
</section>
${ageSection}
<footer>
<p>Questionnaire version: ${escapeHtml(questionnaireVersion)} &middot; Scoring version: ${escapeHtml(scoringVersion)}</p>
<p>Exported: ${escapeHtml(exportedAt)}</p>
</footer>
</main>
</body>
</html>`;
}

/**
 * Triggers a file download in the browser.
 * Not testable in Vitest (requires DOM); tested via manual or E2E.
 */
export function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Derives a datestamp prefix (YYYY-MM-DD) from an ISO timestamp string. */
export function exportDateStamp(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}
