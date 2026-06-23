import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emitEvent, newRequestId, scrub } from "./observability";

// ---- scrub() -----------------------------------------------------------------

describe("scrub()", () => {
  it("returns primitives unchanged", () => {
    expect(scrub("hello")).toBe("hello");
    expect(scrub(42)).toBe(42);
    expect(scrub(true)).toBe(true);
    expect(scrub(null)).toBeNull();
  });

  it("redacts 'answers' key", () => {
    const result = scrub({ answers: [{ questionId: "Q1", optionId: "A" }] });
    expect(result).toEqual({ answers: "[redacted]" });
  });

  it("redacts 'narrative' key", () => {
    const result = scrub({ narrative: { N01: { fields: { event: "..." } } } });
    expect(result).toEqual({ narrative: "[redacted]" });
  });

  it("redacts 'apiKey' key (case-insensitive)", () => {
    const result = scrub({ apiKey: "sk-secret", apikey: "also-secret" });
    expect(result).toEqual({ apiKey: "[redacted]", apikey: "[redacted]" });
  });

  it("redacts 'prompt', 'systemPrompt', 'userPrompt' keys", () => {
    const result = scrub({ prompt: "...", systemPrompt: "...", userPrompt: "..." });
    expect(result).toEqual({
      prompt: "[redacted]",
      systemPrompt: "[redacted]",
      userPrompt: "[redacted]",
    });
  });

  it("redacts 'secret', 'token', 'password', 'authorization' keys", () => {
    const result = scrub({ secret: "x", token: "y", password: "z", authorization: "Bearer t" });
    expect(result).toEqual({
      secret: "[redacted]",
      token: "[redacted]",
      password: "[redacted]",
      authorization: "[redacted]",
    });
  });

  it("redacts 'content', 'excerpt', 'text', 'body' keys", () => {
    const result = scrub({ content: "raw", excerpt: "raw", text: "raw", body: "raw" });
    expect(result).toEqual({
      content: "[redacted]",
      excerpt: "[redacted]",
      text: "[redacted]",
      body: "[redacted]",
    });
  });

  it("passes through permitted operational keys", () => {
    const result = scrub({ event: "score_completed", requestId: "abc", latencyMs: 42 });
    expect(result).toEqual({ event: "score_completed", requestId: "abc", latencyMs: 42 });
  });

  it("recursively processes nested objects", () => {
    const result = scrub({ outer: { answers: "sensitive", latencyMs: 10 } });
    expect(result).toEqual({ outer: { answers: "[redacted]", latencyMs: 10 } });
  });

  it("redacts arrays at any level", () => {
    expect(scrub({ list: [1, 2, 3] })).toEqual({ list: "[array redacted]" });
    expect(scrub([1, 2, 3])).toBe("[array redacted]");
  });

  it("handles empty objects", () => {
    expect(scrub({})).toEqual({});
  });
});

// ---- newRequestId() ----------------------------------------------------------

describe("newRequestId()", () => {
  it("returns a string matching UUID v4 format", () => {
    const id = newRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("returns a unique value on each call", () => {
    expect(newRequestId()).not.toBe(newRequestId());
  });
});

// ---- emitEvent() -------------------------------------------------------------

describe("emitEvent()", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("calls console.log once per event", () => {
    emitEvent({ event: "score_completed", requestId: "r1" });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("emits valid JSON", () => {
    emitEvent({ event: "questionnaire_loaded", requestId: "r2" });
    const raw = consoleSpy.mock.calls[0]?.[0] as string;
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("includes event name and requestId", () => {
    emitEvent({ event: "score_requested", requestId: "req-123" });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(ev["event"]).toBe("score_requested");
    expect(ev["requestId"]).toBe("req-123");
  });

  it("includes ts as an ISO timestamp", () => {
    emitEvent({ event: "score_completed", requestId: "r3" });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(typeof ev["ts"]).toBe("string");
    expect(() => new Date(ev["ts"] as string).toISOString()).not.toThrow();
  });

  it("includes appVersion field", () => {
    emitEvent({ event: "score_completed", requestId: "r4" });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(ev).toHaveProperty("appVersion");
  });

  it("includes optional latencyMs when provided", () => {
    emitEvent({ event: "score_completed", requestId: "r5", latencyMs: 123 });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(ev["latencyMs"]).toBe(123);
  });

  it("includes optional errorCode when provided", () => {
    emitEvent({ event: "score_rejected", requestId: "r6", errorCode: "INVALID_ANSWER_SET" });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(ev["errorCode"]).toBe("INVALID_ANSWER_SET");
  });

  it("includes optional version fields when provided", () => {
    emitEvent({
      event: "analysis_completed",
      requestId: "r7",
      questionnaireVersion: "RMP-1.0",
      scoringVersion: "RMP-SCORE-1.0",
      promptVersion: "RMP-AI-1.0",
    });
    const ev = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(ev["questionnaireVersion"]).toBe("RMP-1.0");
    expect(ev["scoringVersion"]).toBe("RMP-SCORE-1.0");
    expect(ev["promptVersion"]).toBe("RMP-AI-1.0");
  });
});
