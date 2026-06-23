/**
 * Privacy-preserving in-memory rate limiter (I013).
 *
 * Keys are truncated client IPs — never the full address.
 * Gated by the RATE_LIMIT_ENABLED environment variable.
 * Single-instance only; across replicas, rate limits are per-instance.
 */

type BucketConfig = { maxRequests: number; windowMs: number };

const SCORE_CONFIG: BucketConfig = { maxRequests: 10, windowMs: 60_000 };
const ANALYZE_CONFIG: BucketConfig = { maxRequests: 5, windowMs: 60_000 };

// Timestamps of recent requests, keyed by truncated client identifier.
const store = new Map<string, number[]>();

// Lazy eviction: scan for stale buckets at most once per minute.
let lastEviction = 0;

function evictStale(): void {
  const now = Date.now();
  if (now - lastEviction < 60_000) return;
  lastEviction = now;
  const cutoff = now - Math.max(SCORE_CONFIG.windowMs, ANALYZE_CONFIG.windowMs);
  for (const [key, timestamps] of store) {
    if (timestamps.every((t) => t < cutoff)) store.delete(key);
  }
}

function isEnabled(): boolean {
  return process.env["RATE_LIMIT_ENABLED"] !== "false";
}

/** Mask the device-identifying portion of a client IP address. */
function truncateIp(raw: string): string {
  // IPv4: keep first three octets (masks the host-specific octet)
  const v4 = raw.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4 !== null) return (v4[1] ?? raw) + ".0";
  // IPv6 or unrecognised: keep ≤ 19 chars (roughly a /64 prefix)
  return raw.slice(0, 19);
}

/**
 * Derive a privacy-safe bucket key from request headers.
 * Uses X-Forwarded-For when present; falls back to "unknown".
 * The full IP is never stored or logged.
 */
export function extractClientKey(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for");
  const raw = fwd !== null ? (fwd.split(",")[0]?.trim() ?? "unknown") : "unknown";
  return truncateIp(raw);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

function checkLimit(clientKey: string, config: BucketConfig): RateLimitResult {
  evictStale();

  if (!isEnabled()) return { ok: true };

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const existing = store.get(clientKey) ?? [];
  const recent = existing.filter((t) => t >= windowStart);

  if (recent.length >= config.maxRequests) {
    // Prune expired entries while recording the rejection
    store.set(clientKey, recent);
    // Earliest timestamp in window determines when capacity opens again
    const retryAfterMs = recent[0]! + config.windowMs - now;
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1) };
  }

  store.set(clientKey, [...recent, now]);
  return { ok: true };
}

export function checkScoreLimit(clientKey: string): RateLimitResult {
  return checkLimit(clientKey, SCORE_CONFIG);
}

export function checkAnalyzeLimit(clientKey: string): RateLimitResult {
  return checkLimit(clientKey, ANALYZE_CONFIG);
}

/** Test-only: reset all buckets and the eviction clock. */
export function _resetStore(): void {
  store.clear();
  lastEviction = 0;
}
