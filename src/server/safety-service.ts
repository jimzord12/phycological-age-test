/**
 * I012 — Safety service.
 *
 * Two-layer classification: conservative rule layer (always runs, synchronous)
 * plus an optional provider-based layer (async, injected by caller).
 *
 * On `interrupt` the caller must suppress narrative analysis and return
 * `safety_interruption` to the client; structured results stay viewable.
 *
 * Help resources are international safe defaults — country is never inferred
 * from narrative text (PRD §16; DOMAIN §15).
 */

// ---- Public types -----------------------------------------------------------

export type SafetyInterruptReason =
  | "self_harm_immediate"
  | "harm_to_others_immediate"
  | "active_emergency";

export type SafetyDecision =
  | { decision: "allow" }
  | { decision: "interrupt"; reason: SafetyInterruptReason; message: SafetyMessage }
  | { decision: "review_fallback"; reason: "ambiguous_high_risk" };

export type HelpResource = {
  name: string;
  description: string;
  contact: string;
};

export type SafetyMessage = {
  heading: string;
  body: string;
  resources: HelpResource[];
};

/**
 * Optional provider-based classifier injected by the caller (I011).
 * Receives the narrative text; must return a safety level.
 * A thrown error is treated as non-fatal; the rule-layer result is used instead.
 */
export type ProviderClassifier = (
  text: string,
) => Promise<
  | "interrupt_self_harm"
  | "interrupt_harm_others"
  | "interrupt_emergency"
  | "review_fallback"
  | "allow"
>;

// ---- Rule patterns ----------------------------------------------------------
// Each set is ordered from most specific to least specific.
// Patterns are matched against the full narrative text (case-insensitive).

const SELF_HARM_IMMEDIATE: readonly RegExp[] = [
  // "I am/I'm going to / about to / will" + self-harm
  /\bi(?:'m|\s+am)\s+(?:going\s+to|about\s+to)\s+(?:kill|hurt|harm|end)\s+my(?:self|(?:\s+own)?\s+life)\b/i,
  /\bi\s+will\s+(?:kill|hurt|harm|end)\s+my(?:self|(?:\s+own)?\s+life)\b/i,
  /\bi\s+want\s+to\s+(?:kill|end)\s+my(?:self|(?:\s+own)?\s+life)\b/i,
  // "plan(ning) to" self-harm
  /\bplan(?:ning)?\s+to\s+(?:kill|hurt|harm|end)\s+my(?:self|(?:\s+own)?\s+life)\b/i,
  // Explicit suicide intent
  /\bi(?:'m|\s+am)\s+(?:going\s+to|about\s+to|planning\s+to)\s+(?:commit\s+)?suicide\b/i,
  /\bi\s+will\s+(?:commit\s+)?suicide\b/i,
  // Overdose with immediacy
  /\b(?:taking|took|going\s+to\s+take)\s+(?:all\s+(?:my|the)\s+)?(?:pills?|medication|meds)\s+(?:now|tonight|to\s+(?:die|end\s+it))\b/i,
  // "ready to end / take my life"
  /\b(?:ready|prepared)\s+to\s+(?:end|take)\s+(?:my\s+(?:own\s+)?)?life\b/i,
];

const HARM_TO_OTHERS_IMMEDIATE: readonly RegExp[] = [
  /\bi(?:'m|\s+am)\s+(?:going\s+to|about\s+to)\s+(?:kill|hurt|harm|attack|shoot|stab)\s+(?:him|her|them|you|someone|my\b)/i,
  /\bi\s+will\s+(?:kill|hurt|harm|attack|shoot|stab)\s+(?:him|her|them|you|someone|my\b)/i,
  /\bplan(?:ning)?\s+to\s+(?:kill|shoot|stab|attack|hurt)\s+(?:him|her|them|you|someone)\b/i,
];

const ACTIVE_EMERGENCY: readonly RegExp[] = [
  /\b(?:please\s+)?call\s+(?:911|999|112|emergency\s+services?)\b/i,
  /\bi(?:'m|\s+am)\s+(?:in\s+)?(?:an?\s+)?(?:active\s+)?emergency\b/i,
  /\bsomeone\s+(?:is|has\s+been)\s+(?:attacking|hurting|assaulting)\s+me\b/i,
  /\bi'?m\s+being\s+(?:attacked|assaulted|stabbed|shot)\b/i,
];

const AMBIGUOUS_HIGH_RISK: readonly RegExp[] = [
  /\bsuicid(?:e|al|ality)\b/i,
  /\bwant\s+to\s+(?:die|end\s+it(?:\s+all)?|not\s+be\s+here(?:\s+anymore)?)\b/i,
  /\bdon'?t\s+want\s+to\s+(?:live|be\s+alive|be\s+here|exist)\b/i,
  /\b(?:rather|better\s+off)\s+(?:be\s+)?dead\b/i,
  /\bself[- ]?harm(?:ing|ed|s)?\b/i,
  /\bcutting\s+(?:my(?:self)?|on\s+(?:my|the))\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:live|go(?:ing)?\s+on|keep\s+(?:living|going))\b/i,
  /\bthink(?:ing)?\s+about\s+(?:ending|taking)\s+(?:my\s+(?:own\s+)?)?life\b/i,
];

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// ---- Help resources ---------------------------------------------------------
// International safe defaults — never country-inferred from narrative content.

const DEFAULT_RESOURCES: readonly HelpResource[] = [
  {
    name: "International Association for Suicide Prevention",
    description: "Directory of crisis centres worldwide.",
    contact: "https://www.iasp.info/resources/Crisis_Centres/",
  },
  {
    name: "Befrienders Worldwide",
    description: "Emotional support network with centres in 32 countries.",
    contact: "https://www.befrienders.org",
  },
  {
    name: "Crisis Text Line",
    description: "Free 24/7 text-based crisis support (US, UK, Ireland, Canada).",
    contact: "Text HOME to 741741",
  },
];

/** Returns the international safe-default help resources. */
export function selectHelpResources(): HelpResource[] {
  return [...DEFAULT_RESOURCES];
}

// ---- SafetyMessage builder --------------------------------------------------

function buildSafetyMessage(reason: SafetyInterruptReason): SafetyMessage {
  const resources = selectHelpResources();
  if (reason === "self_harm_immediate") {
    return {
      heading: "It looks like you may be in crisis right now.",
      body: "Please reach out to a crisis service. These resources are free, confidential, and not connected to this assessment.",
      resources,
    };
  }
  if (reason === "harm_to_others_immediate") {
    return {
      heading: "We noticed content that may indicate immediate risk to others.",
      body: "If someone is in immediate danger, please contact emergency services. These resources can also provide support.",
      resources,
    };
  }
  return {
    heading: "It sounds like you may be in an emergency situation.",
    body: "Please contact emergency services in your area immediately. These resources may also help.",
    resources,
  };
}

// ---- Rule-based classification (synchronous) --------------------------------

/**
 * Applies the internal rule layer to a text fragment.
 * Exported for direct unit testing; production callers should use classifySafety.
 */
export function classifyRules(text: string): SafetyDecision {
  if (matchesAny(text, SELF_HARM_IMMEDIATE)) {
    return {
      decision: "interrupt",
      reason: "self_harm_immediate",
      message: buildSafetyMessage("self_harm_immediate"),
    };
  }
  if (matchesAny(text, HARM_TO_OTHERS_IMMEDIATE)) {
    return {
      decision: "interrupt",
      reason: "harm_to_others_immediate",
      message: buildSafetyMessage("harm_to_others_immediate"),
    };
  }
  if (matchesAny(text, ACTIVE_EMERGENCY)) {
    return {
      decision: "interrupt",
      reason: "active_emergency",
      message: buildSafetyMessage("active_emergency"),
    };
  }
  if (matchesAny(text, AMBIGUOUS_HIGH_RISK)) {
    return { decision: "review_fallback", reason: "ambiguous_high_risk" };
  }
  return { decision: "allow" };
}

// ---- Two-layer public API ---------------------------------------------------

/**
 * Classifies narrative text for safety concerns.
 *
 * The rule layer always runs first. If it returns `interrupt`, the result is
 * final — the provider layer cannot downgrade it. If the provider layer fails,
 * the rule-layer result is returned unchanged.
 *
 * @param text            Combined narrative text to classify.
 * @param providerClassifier  Optional provider-based classifier (I011 injects this).
 */
export async function classifySafety(
  text: string,
  providerClassifier?: ProviderClassifier,
): Promise<SafetyDecision> {
  const ruleDecision = classifyRules(text);

  // Immediate interrupt from rules is never downgraded.
  if (ruleDecision.decision === "interrupt") {
    return ruleDecision;
  }

  if (providerClassifier !== undefined) {
    try {
      const providerResult = await providerClassifier(text);
      if (providerResult === "interrupt_self_harm") {
        return {
          decision: "interrupt",
          reason: "self_harm_immediate",
          message: buildSafetyMessage("self_harm_immediate"),
        };
      }
      if (providerResult === "interrupt_harm_others") {
        return {
          decision: "interrupt",
          reason: "harm_to_others_immediate",
          message: buildSafetyMessage("harm_to_others_immediate"),
        };
      }
      if (providerResult === "interrupt_emergency") {
        return {
          decision: "interrupt",
          reason: "active_emergency",
          message: buildSafetyMessage("active_emergency"),
        };
      }
      if (providerResult === "review_fallback") {
        return { decision: "review_fallback", reason: "ambiguous_high_risk" };
      }
      // providerResult === "allow" falls through to ruleDecision
    } catch {
      // Provider failures are non-fatal; return the rule-layer result.
    }
  }

  return ruleDecision;
}
