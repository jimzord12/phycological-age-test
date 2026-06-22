import { describe, it, expect } from "vitest";
import { getBandLabel, getGrowthAreas, formatConfidenceReason } from "./results-screen";
import type { DimensionResult } from "@/domain/result-types";
import { DIMENSION_IDS, type DimensionId } from "@/domain/result-types";
import type { ConfidenceReason } from "@/domain/result-types";

// ---------------------------------------------------------------------------
// getBandLabel
// ---------------------------------------------------------------------------

describe("getBandLabel", () => {
  it("returns Emerging for score 0", () => {
    expect(getBandLabel(0)).toBe("Emerging");
  });

  it("returns Emerging for score 24", () => {
    expect(getBandLabel(24)).toBe("Emerging");
  });

  it("returns Developing for score 25", () => {
    expect(getBandLabel(25)).toBe("Developing");
  });

  it("returns Developing for score 49", () => {
    expect(getBandLabel(49)).toBe("Developing");
  });

  it("returns Established for score 50", () => {
    expect(getBandLabel(50)).toBe("Established");
  });

  it("returns Established for score 74", () => {
    expect(getBandLabel(74)).toBe("Established");
  });

  it("returns Proficient for score 75", () => {
    expect(getBandLabel(75)).toBe("Proficient");
  });

  it("returns Proficient for score 89", () => {
    expect(getBandLabel(89)).toBe("Proficient");
  });

  it("returns Integrated for score 90", () => {
    expect(getBandLabel(90)).toBe("Integrated");
  });

  it("returns Integrated for score 100", () => {
    expect(getBandLabel(100)).toBe("Integrated");
  });
});

// ---------------------------------------------------------------------------
// getGrowthAreas
// ---------------------------------------------------------------------------

function makeDimensions(
  overrides: Partial<Record<DimensionId, DimensionResult>>,
): Record<DimensionId, DimensionResult> {
  const base: Record<DimensionId, DimensionResult> = {
    ER: { status: "insufficient_data", answered: 0, required: 4, available: 5 },
    IC: { status: "insufficient_data", answered: 0, required: 4, available: 5 },
    PT: { status: "insufficient_data", answered: 0, required: 4, available: 5 },
    IS: { status: "insufficient_data", answered: 0, required: 3, available: 4 },
    TD: { status: "insufficient_data", answered: 0, required: 4, available: 5 },
  };
  return { ...base, ...overrides };
}

describe("getGrowthAreas", () => {
  it("returns null strongest and empty growth when no dimensions are reportable", () => {
    const dims = makeDimensions({});
    expect(getGrowthAreas(dims)).toEqual({ strongest: null, growth: [] });
  });

  it("returns the single reportable dimension as strongest with no growth areas", () => {
    const dims = makeDimensions({
      ER: { status: "reportable", score: 70, answered: 5, available: 5 },
    });
    expect(getGrowthAreas(dims)).toEqual({ strongest: "ER", growth: [] });
  });

  it("returns strongest and one growth area when exactly 2 reportable", () => {
    const dims = makeDimensions({
      ER: { status: "reportable", score: 80, answered: 5, available: 5 },
      IC: { status: "reportable", score: 40, answered: 5, available: 5 },
    });
    const result = getGrowthAreas(dims);
    expect(result.strongest).toBe("ER");
    expect(result.growth).toEqual(["IC"]);
  });

  it("returns strongest and two growth areas when 3+ reportable", () => {
    const dims = makeDimensions({
      ER: { status: "reportable", score: 90, answered: 5, available: 5 },
      IC: { status: "reportable", score: 60, answered: 5, available: 5 },
      PT: { status: "reportable", score: 30, answered: 5, available: 5 },
      IS: { status: "reportable", score: 20, answered: 4, available: 4 },
    });
    const result = getGrowthAreas(dims);
    expect(result.strongest).toBe("ER");
    expect(result.growth).toHaveLength(2);
    // Bottom 2 should be IS (20) and PT (30)
    expect(result.growth).toContain("IS");
    expect(result.growth).toContain("PT");
  });

  it("returns strongest and two growth areas for all 5 reportable dimensions", () => {
    const dims = makeDimensions({
      ER: { status: "reportable", score: 85, answered: 5, available: 5 },
      IC: { status: "reportable", score: 75, answered: 5, available: 5 },
      PT: { status: "reportable", score: 60, answered: 5, available: 5 },
      IS: { status: "reportable", score: 45, answered: 4, available: 4 },
      TD: { status: "reportable", score: 30, answered: 5, available: 5 },
    });
    const result = getGrowthAreas(dims);
    expect(result.strongest).toBe("ER");
    expect(result.growth).toHaveLength(2);
    expect(result.growth).toContain("IS");
    expect(result.growth).toContain("TD");
  });

  it("all five dimensions equal score picks a deterministic strongest", () => {
    const dims = makeDimensions({
      ER: { status: "reportable", score: 50, answered: 5, available: 5 },
      IC: { status: "reportable", score: 50, answered: 5, available: 5 },
      PT: { status: "reportable", score: 50, answered: 5, available: 5 },
      IS: { status: "reportable", score: 50, answered: 4, available: 4 },
      TD: { status: "reportable", score: 50, answered: 5, available: 5 },
    });
    const result = getGrowthAreas(dims);
    // All equal — any one dimension is valid as "strongest"
    expect(DIMENSION_IDS).toContain(result.strongest);
    expect(result.growth).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// formatConfidenceReason
// ---------------------------------------------------------------------------

describe("formatConfidenceReason", () => {
  it("formats extra_not_applicable (singular)", () => {
    const reason: ConfidenceReason = {
      code: "extra_not_applicable",
      count: 1,
      deducted: 5,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("1");
    expect(text).toContain("response");
    expect(text).toContain("−5 pts");
    // Should not say "responses" for count=1
    expect(text).not.toContain("responses");
  });

  it("formats extra_not_applicable (plural)", () => {
    const reason: ConfidenceReason = {
      code: "extra_not_applicable",
      count: 3,
      deducted: 15,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("3");
    expect(text).toContain("responses");
    expect(text).toContain("−15 pts");
  });

  it("formats non_reportable_dimension", () => {
    const reason: ConfidenceReason = {
      code: "non_reportable_dimension",
      dimension: "ER",
      deducted: 15,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("Emotional Regulation");
    expect(text).toContain("−15 pts");
  });

  it("formats low_coverage (singular)", () => {
    const reason: ConfidenceReason = {
      code: "low_coverage",
      missingOrNa: 1,
      deducted: 10,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("1 item");
    expect(text).toContain("−10 pts");
    expect(text).not.toContain("items");
  });

  it("formats low_coverage (plural)", () => {
    const reason: ConfidenceReason = {
      code: "low_coverage",
      missingOrNa: 5,
      deducted: 10,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("5 items");
  });

  it("formats inconsistent_pair", () => {
    const reason: ConfidenceReason = {
      code: "inconsistent_pair",
      pair: ["ER01", "ER05"],
      deducted: 5,
    };
    const text = formatConfidenceReason(reason);
    expect(text).toContain("ER01");
    expect(text).toContain("ER05");
    expect(text).toContain("−5 pts");
  });
});
