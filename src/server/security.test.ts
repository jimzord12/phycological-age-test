/**
 * I014 — Security hardening tests.
 *
 * Verifies that CSP / security headers are configured, Content-Type
 * gating is in place on API routes, and no provider secret is exposed
 * to the client via NEXT_PUBLIC_ env vars.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";
import { SECURITY_HEADERS, CSP_DIRECTIVES } from "../../next.config";

// ---- next.config.ts header exports ----------------------------------------

describe("SECURITY_HEADERS from next.config.ts", () => {
  it("includes a Content-Security-Policy header", () => {
    const csp = SECURITY_HEADERS.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
  });

  it("CSP restricts default-src to self", () => {
    expect(CSP_DIRECTIVES).toContain("default-src 'self'");
  });

  it("CSP blocks object-src (no plugins)", () => {
    expect(CSP_DIRECTIVES).toContain("object-src 'none'");
  });

  it("CSP blocks frame-ancestors (clickjacking)", () => {
    expect(CSP_DIRECTIVES).toContain("frame-ancestors 'none'");
  });

  it("CSP restricts base-uri to self (no base-tag injection)", () => {
    expect(CSP_DIRECTIVES).toContain("base-uri 'self'");
  });

  it("CSP restricts connect-src to self (no exfiltration to third parties)", () => {
    expect(CSP_DIRECTIVES).toContain("connect-src 'self'");
  });

  it("includes X-Frame-Options: DENY", () => {
    const h = SECURITY_HEADERS.find((h) => h.key === "X-Frame-Options");
    expect(h?.value).toBe("DENY");
  });

  it("includes X-Content-Type-Options: nosniff", () => {
    const h = SECURITY_HEADERS.find((h) => h.key === "X-Content-Type-Options");
    expect(h?.value).toBe("nosniff");
  });

  it("includes Referrer-Policy", () => {
    const h = SECURITY_HEADERS.find((h) => h.key === "Referrer-Policy");
    expect(h).toBeDefined();
  });

  it("includes Permissions-Policy restricting sensitive APIs", () => {
    const h = SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy");
    expect(h?.value).toContain("camera=()");
    expect(h?.value).toContain("microphone=()");
    expect(h?.value).toContain("geolocation=()");
  });
});

// ---- Provider secret exposure -----------------------------------------------

describe("no NEXT_PUBLIC_ env vars expose provider secrets", () => {
  it("ai-provider.ts uses no NEXT_PUBLIC_-prefixed env var names", () => {
    const src = readFileSync(resolve(__dirname, "ai-provider.ts"), "utf-8");
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
  });
});

// ---- API route Content-Type gating ------------------------------------------

describe("POST /api/v1/assessments/score — Content-Type enforcement", () => {
  it("returns 415 when Content-Type is missing", async () => {
    const { POST } = await import("../app/api/v1/assessments/score/route");
    const req = new NextRequest("http://localhost/api/v1/assessments/score", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 415 when Content-Type is text/plain", async () => {
    const { POST } = await import("../app/api/v1/assessments/score/route");
    const req = new NextRequest("http://localhost/api/v1/assessments/score", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it("does not return 415 when Content-Type is application/json", async () => {
    const { POST } = await import("../app/api/v1/assessments/score/route");
    const req = new NextRequest("http://localhost/api/v1/assessments/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionnaireVersion: "RMP-1.0", answers: [] }),
    });
    const res = await POST(req);
    expect(res.status).not.toBe(415);
  });
});

describe("POST /api/v1/assessments/analyze — Content-Type enforcement", () => {
  it("returns 415 when Content-Type is missing", async () => {
    const { POST } = await import("../app/api/v1/assessments/analyze/route");
    const req = new NextRequest("http://localhost/api/v1/assessments/analyze", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 415 when Content-Type is application/x-www-form-urlencoded", async () => {
    const { POST } = await import("../app/api/v1/assessments/analyze/route");
    const req = new NextRequest("http://localhost/api/v1/assessments/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "foo=bar",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });
});
