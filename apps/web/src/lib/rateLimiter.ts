/**
 * Simple in-process rate limiter using a sliding window token bucket.
 * Suitable for Next.js Node.js runtime API routes.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return NextResponse.json(..., { status: 429 });
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed per window per identifier */
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms timestamp
}

interface BucketEntry {
  count: number;
  windowStart: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, BucketEntry>();

  // Prune stale entries periodically to prevent unbounded memory growth
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (now - entry.windowStart > windowMs) {
        buckets.delete(key);
      }
    }
  }, windowMs * 2);

  // Allow GC when the module is unloaded (e.g. in tests)
  pruneInterval.unref?.();

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const existing = buckets.get(identifier);

      if (!existing || now - existing.windowStart > windowMs) {
        // Start a fresh window
        buckets.set(identifier, { count: 1, windowStart: now });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.windowStart + windowMs,
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: maxRequests - existing.count,
        resetAt: existing.windowStart + windowMs,
      };
    },
  };
}
