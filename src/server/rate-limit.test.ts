import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractClientKey, checkScoreLimit, checkAnalyzeLimit, _resetStore } from "./rate-limit";

// ---- extractClientKey() ------------------------------------------------------

describe("extractClientKey()", () => {
  function headers(entries: Record<string, string>): { get(name: string): string | null } {
    return { get: (name: string) => entries[name] ?? null };
  }

  it("truncates an IPv4 address to the /24 prefix", () => {
    expect(extractClientKey(headers({ "x-forwarded-for": "192.168.1.42" }))).toBe("192.168.1.0");
    expect(extractClientKey(headers({ "x-forwarded-for": "10.0.0.255" }))).toBe("10.0.0.0");
  });

  it("uses the first address when X-Forwarded-For has multiple values", () => {
    expect(extractClientKey(headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.0");
  });

  it("returns 'unknown' when the header is absent", () => {
    expect(extractClientKey(headers({}))).toBe("unknown");
  });

  it("truncates non-IPv4 addresses to 19 characters", () => {
    const ipv6 = "2001:db8::1";
    const key = extractClientKey(headers({ "x-forwarded-for": ipv6 }));
    expect(key.length).toBeLessThanOrEqual(19);
  });

  it("trims whitespace from the first IP in a forwarded list", () => {
    expect(extractClientKey(headers({ "x-forwarded-for": "  10.1.2.3  , 4.5.6.7" }))).toBe(
      "10.1.2.0",
    );
  });
});

// ---- checkScoreLimit() -------------------------------------------------------

describe("checkScoreLimit()", () => {
  const ENABLED_ENV = "true";
  const savedEnv = process.env["RATE_LIMIT_ENABLED"];

  beforeEach(() => {
    _resetStore();
    process.env["RATE_LIMIT_ENABLED"] = ENABLED_ENV;
  });

  afterEach(() => {
    process.env["RATE_LIMIT_ENABLED"] = savedEnv;
  });

  it("allows the first request", () => {
    expect(checkScoreLimit("client-a")).toEqual({ ok: true });
  });

  it("allows up to the window limit (10)", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkScoreLimit("client-b")).toEqual({ ok: true });
    }
  });

  it("rejects the 11th request within the window", () => {
    for (let i = 0; i < 10; i++) checkScoreLimit("client-c");
    const result = checkScoreLimit("client-c");
    expect(result.ok).toBe(false);
  });

  it("includes a positive retryAfterMs when rejecting", () => {
    for (let i = 0; i < 10; i++) checkScoreLimit("client-d");
    const result = checkScoreLimit("client-d");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("tracks buckets independently per client key", () => {
    for (let i = 0; i < 10; i++) checkScoreLimit("client-e");
    // Different key should still be allowed
    expect(checkScoreLimit("client-f")).toEqual({ ok: true });
  });

  it("allows all requests when RATE_LIMIT_ENABLED=false", () => {
    process.env["RATE_LIMIT_ENABLED"] = "false";
    for (let i = 0; i < 20; i++) {
      expect(checkScoreLimit("client-g")).toEqual({ ok: true });
    }
  });
});

// ---- checkAnalyzeLimit() -----------------------------------------------------

describe("checkAnalyzeLimit()", () => {
  const savedEnv = process.env["RATE_LIMIT_ENABLED"];

  beforeEach(() => {
    _resetStore();
    process.env["RATE_LIMIT_ENABLED"] = "true";
  });

  afterEach(() => {
    process.env["RATE_LIMIT_ENABLED"] = savedEnv;
  });

  it("allows up to 5 requests in the window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkAnalyzeLimit("az-client")).toEqual({ ok: true });
    }
  });

  it("rejects the 6th request within the window", () => {
    for (let i = 0; i < 5; i++) checkAnalyzeLimit("az-client2");
    const result = checkAnalyzeLimit("az-client2");
    expect(result.ok).toBe(false);
  });

  it("allows all requests when RATE_LIMIT_ENABLED=false", () => {
    process.env["RATE_LIMIT_ENABLED"] = "false";
    for (let i = 0; i < 10; i++) {
      expect(checkAnalyzeLimit("az-client3")).toEqual({ ok: true });
    }
  });

  it("analyze and score limits are independent per endpoint", () => {
    // Exhaust analyze limit
    for (let i = 0; i < 5; i++) checkAnalyzeLimit("shared-client");
    expect(checkAnalyzeLimit("shared-client").ok).toBe(false);
    // Score limit for same key is unaffected (separate bucket config)
    expect(checkScoreLimit("shared-client")).toEqual({ ok: true });
  });
});
