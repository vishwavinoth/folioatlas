/**
 * FolioAtlas — in-memory sliding-window rate limiter (server-side only).
 *
 * Used for expensive endpoints (AI search, AI summary generation). State is
 * per-process; for multi-instance deployments back this with a shared store.
 */
type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map cannot grow without bound.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanup(now, windowMs);
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client IP extraction behind the gateway proxy. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
