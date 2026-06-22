import { describe, it, expect, vi } from "vitest";
import {
  classifyRules,
  classifySafety,
  selectHelpResources,
  type SafetyDecision,
  type ProviderClassifier,
} from "./safety-service";

// ---- selectHelpResources ----------------------------------------------------

describe("selectHelpResources", () => {
  it("returns a non-empty array of resources", () => {
    const resources = selectHelpResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it("every resource has name, description, and contact", () => {
    for (const r of selectHelpResources()) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
      expect(r.contact.length).toBeGreaterThan(0);
    }
  });

  it("returns a fresh copy each call (no shared mutation)", () => {
    const a = selectHelpResources();
    const b = selectHelpResources();
    expect(a).not.toBe(b);
  });
});

// ---- classifyRules — allow --------------------------------------------------

describe("classifyRules — allow", () => {
  const SAFE_TEXTS = [
    "I try to stay calm when I'm frustrated.",
    "I think about my future and how I want to grow.",
    "When I was younger I made impulsive decisions but I've changed.",
    "Sometimes I feel misunderstood but I work through it.",
    "I reflect on conflicts and try to see the other person's point of view.",
    "In the past I struggled a lot but I'm in a good place now.",
    "My identity feels more stable than it used to be.",
    "I set long-term goals and revisit them regularly.",
  ];

  for (const text of SAFE_TEXTS) {
    it(`allows: "${text.slice(0, 60)}"`, () => {
      expect(classifyRules(text)).toEqual({ decision: "allow" });
    });
  }
});

// ---- classifyRules — self_harm_immediate ------------------------------------

describe("classifyRules — interrupt: self_harm_immediate", () => {
  const TEXTS = [
    "I'm going to kill myself",
    "I am going to kill myself tonight",
    "i will kill myself",
    "I want to kill myself",
    "I'm about to end my life",
    "I am about to hurt myself",
    "planning to kill myself",
    "I'm going to commit suicide",
    "i will commit suicide",
    "I am going to commit suicide",
    "I'm going to take all my pills now",
    "going to take all the medication to end it",
    "ready to end my life",
    "I am prepared to end my own life",
    "i'm going to harm myself",
    "I plan to end my life",
  ];

  for (const text of TEXTS) {
    it(`interrupts self_harm_immediate: "${text}"`, () => {
      const result = classifyRules(text);
      expect(result.decision).toBe("interrupt");
      if (result.decision === "interrupt") {
        expect(result.reason).toBe("self_harm_immediate");
        expect(result.message.heading.length).toBeGreaterThan(0);
        expect(result.message.resources.length).toBeGreaterThan(0);
      }
    });
  }
});

// ---- classifyRules — harm_to_others_immediate -------------------------------

describe("classifyRules — interrupt: harm_to_others_immediate", () => {
  const TEXTS = [
    "I'm going to kill him",
    "I am going to hurt her",
    "i will attack them",
    "I'm about to shoot someone",
    "planning to stab you",
    "I will harm someone",
    "i'm going to hurt my brother",
  ];

  for (const text of TEXTS) {
    it(`interrupts harm_to_others_immediate: "${text}"`, () => {
      const result = classifyRules(text);
      expect(result.decision).toBe("interrupt");
      if (result.decision === "interrupt") {
        expect(result.reason).toBe("harm_to_others_immediate");
        expect(result.message.resources.length).toBeGreaterThan(0);
      }
    });
  }
});

// ---- classifyRules — active_emergency ---------------------------------------

describe("classifyRules — interrupt: active_emergency", () => {
  const TEXTS = [
    "Please call 911",
    "call 999",
    "call 112",
    "I am in an emergency",
    "someone is attacking me",
    "someone has been assaulting me",
    "I'm being attacked",
    "call emergency services",
    "i'm being stabbed",
  ];

  for (const text of TEXTS) {
    it(`interrupts active_emergency: "${text}"`, () => {
      const result = classifyRules(text);
      expect(result.decision).toBe("interrupt");
      if (result.decision === "interrupt") {
        expect(result.reason).toBe("active_emergency");
        expect(result.message.resources.length).toBeGreaterThan(0);
      }
    });
  }
});

// ---- classifyRules — review_fallback ----------------------------------------

describe("classifyRules — review_fallback: ambiguous_high_risk", () => {
  const TEXTS = [
    "I've been suicidal in the past",
    "I'm feeling suicidal",
    "suicidal thoughts have visited me",
    "I want to die sometimes",
    "I don't want to be here anymore",
    "I don't want to live like this",
    "I would rather be dead",
    "I'd be better off dead",
    "I've struggled with self-harm",
    "cutting myself was something I did years ago",
    "I used to self-harm",
    "there's no reason to live",
    "no point in going on",
    "I've been thinking about ending my life",
    "thinking about taking my own life",
  ];

  for (const text of TEXTS) {
    it(`review_fallback: "${text.slice(0, 60)}"`, () => {
      const result = classifyRules(text);
      expect(result.decision).toBe("review_fallback");
      if (result.decision === "review_fallback") {
        expect(result.reason).toBe("ambiguous_high_risk");
      }
    });
  }
});

// ---- SafetyMessage structure ------------------------------------------------

describe("SafetyMessage on interrupt", () => {
  it("self_harm message has heading, body, and resources", () => {
    const result = classifyRules("I'm going to kill myself");
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.message.heading).toBeTruthy();
      expect(result.message.body).toBeTruthy();
      expect(Array.isArray(result.message.resources)).toBe(true);
      expect(result.message.resources.length).toBeGreaterThan(0);
    }
  });

  it("harm_to_others message has heading, body, and resources", () => {
    const result = classifyRules("I'm going to kill him");
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.message.heading).toBeTruthy();
      expect(result.message.body).toBeTruthy();
      expect(result.message.resources.length).toBeGreaterThan(0);
    }
  });

  it("emergency message has heading, body, and resources", () => {
    const result = classifyRules("call 911");
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.message.heading).toBeTruthy();
      expect(result.message.body).toBeTruthy();
      expect(result.message.resources.length).toBeGreaterThan(0);
    }
  });

  it("resources are international — not country-inferred from text", () => {
    // Verify no resource appears to make an assumption about user's country
    // based on narrative content (i.e., resources are the same for all texts)
    const r1 = classifyRules("I'm going to kill myself");
    const r2 = classifyRules("call 911");
    if (r1.decision === "interrupt" && r2.decision === "interrupt") {
      expect(r1.message.resources).toEqual(r2.message.resources);
    }
  });
});

// ---- classifySafety (async two-layer) ---------------------------------------

describe("classifySafety", () => {
  it("returns rule-layer allow when no provider given and text is safe", async () => {
    const result = await classifySafety("I try to reflect on my actions.");
    expect(result).toEqual({ decision: "allow" });
  });

  it("returns rule-layer interrupt without calling provider", async () => {
    const provider = vi.fn<ProviderClassifier>();
    const result = await classifySafety("I'm going to kill myself", provider);
    expect(result.decision).toBe("interrupt");
    // Provider must NOT be called when rules already return interrupt
    expect(provider).not.toHaveBeenCalled();
  });

  it("provider can escalate allow → interrupt_self_harm", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("interrupt_self_harm");
    const result = await classifySafety("normal-sounding text", provider);
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.reason).toBe("self_harm_immediate");
      expect(result.message.resources.length).toBeGreaterThan(0);
    }
    expect(provider).toHaveBeenCalledWith("normal-sounding text");
  });

  it("provider can escalate allow → interrupt_harm_others", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("interrupt_harm_others");
    const result = await classifySafety("some ambiguous text", provider);
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.reason).toBe("harm_to_others_immediate");
    }
  });

  it("provider can escalate allow → interrupt_emergency", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("interrupt_emergency");
    const result = await classifySafety("some text", provider);
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.reason).toBe("active_emergency");
    }
  });

  it("provider can escalate allow → review_fallback", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("review_fallback");
    const result = await classifySafety("normal-sounding text", provider);
    expect(result).toEqual({ decision: "review_fallback", reason: "ambiguous_high_risk" });
  });

  it("provider allow leaves rule-layer allow unchanged", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("allow");
    const result = await classifySafety("normal text", provider);
    expect(result).toEqual({ decision: "allow" });
  });

  it("provider can escalate review_fallback → interrupt", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("interrupt_self_harm");
    // "suicidal" triggers review_fallback from rules
    const result = await classifySafety("I've been suicidal in the past", provider);
    expect(result.decision).toBe("interrupt");
    if (result.decision === "interrupt") {
      expect(result.reason).toBe("self_harm_immediate");
    }
  });

  it("provider failure is non-fatal — rule-layer result returned", async () => {
    const provider = vi.fn<ProviderClassifier>().mockRejectedValue(new Error("network error"));
    const result = await classifySafety("I've been suicidal in the past", provider);
    // Rule layer returned review_fallback; provider threw; should still be review_fallback
    expect(result).toEqual({ decision: "review_fallback", reason: "ambiguous_high_risk" });
  });

  it("provider never called without being passed", async () => {
    // Ensure no implicit global provider
    const result = await classifySafety("I'm going to kill myself");
    expect(result.decision).toBe("interrupt");
  });

  it("interrupt from rules cannot be downgraded by provider returning allow", async () => {
    const provider = vi.fn<ProviderClassifier>().mockResolvedValue("allow");
    const result = await classifySafety("I'm going to kill myself", provider);
    // Rule layer returned interrupt; provider should NOT be called
    expect(result.decision).toBe("interrupt");
    expect(provider).not.toHaveBeenCalled();
  });
});

// ---- Acceptance criteria summary --------------------------------------------

describe("acceptance criteria", () => {
  it("mocked immediate-risk content yields interrupt", async () => {
    const result = await classifySafety("I'm going to kill myself");
    expect(result.decision).toBe("interrupt");
  });

  it("safety classification has an internal rule layer independent of analysis prompt", () => {
    // classifyRules is synchronous and has no dependency on AI or prompts
    const result = classifyRules("I'm going to kill myself");
    expect(result.decision).toBe("interrupt");
  });

  it("help resources are decoupled from analysis prompt and not country-inferred", () => {
    const resources = selectHelpResources();
    expect(resources.length).toBeGreaterThan(0);
    // Resources contain international links/contacts, not a single country's services
    const hasInternational = resources.some(
      (r) => r.name.includes("International") || r.description.includes("worldwide") || r.description.includes("countries")
    );
    expect(hasInternational).toBe(true);
  });

  it("review_fallback does not suppress structured result (decision is not interrupt)", () => {
    const result = classifyRules("I've been suicidal in the past");
    // review_fallback means structured result stays viewable; only interrupt suppresses analysis
    expect(result.decision).toBe("review_fallback");
    expect(result.decision).not.toBe("interrupt");
  });
});
