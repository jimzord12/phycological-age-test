/**
 * Structured, privacy-safe operational event logging (I013).
 *
 * Permitted fields: operational metadata only.
 * NEVER emit: answer choices, narrative text, prompts, model excerpts,
 * full IPs, API keys, or credentials.
 */

export type EventName =
  | "questionnaire_loaded"
  | "score_requested"
  | "score_completed"
  | "score_rejected"
  | "analysis_requested"
  | "analysis_completed"
  | "analysis_unavailable"
  | "safety_interruption"
  | "export_generated";

export type StructuredEvent = {
  event: EventName;
  requestId: string;
  ts: string;
  questionnaireVersion?: string;
  scoringVersion?: string;
  promptVersion?: string;
  status?: string;
  latencyMs?: number;
  errorCode?: string;
  appVersion: string;
};

const APP_VERSION = process.env["npm_package_version"] ?? "unknown";

export function newRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Redact known sensitive keys from an arbitrary object before logging.
 * Prevents accidental emission of answer bodies, narrative text, or secrets.
 */
export function scrub(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return "[array redacted]";
  const SENSITIVE = new Set([
    "answers",
    "narrative",
    "fields",
    "apikey",
    "password",
    "token",
    "secret",
    "authorization",
    "prompt",
    "systemprompt",
    "userprompt",
    "text",
    "content",
    "excerpt",
    "body",
  ]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE.has(k.toLowerCase()) ? "[redacted]" : scrub(v);
  }
  return result;
}

/**
 * Emit a structured event to stdout as newline-delimited JSON.
 * Caller is responsible for including only permitted fields.
 */
export function emitEvent(partial: Omit<StructuredEvent, "ts" | "appVersion">): void {
  const ev: StructuredEvent = {
    ...partial,
    ts: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(ev));
}
