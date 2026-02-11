// src/lib/rateLimit.ts — In-memory rate limiter with automatic cleanup.
//
// NOTE: In-memory state does NOT persist across serverless cold starts.
// For production-grade limiting, replace the Map with an external store
// (e.g., Vercel KV, Upstash Redis). This module is still useful as a
// best-effort guard and works well on long-running Node processes.

import 'server-only';

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed in the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

const CLEANUP_INTERVAL_MS = 60_000; // sweep stale entries every 60s

class RateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private max: number;
  private windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: RateLimiterOptions) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
    this.startCleanup();
  }

  /**
   * Check whether a key (typically an IP address) has exceeded the limit.
   * Returns `{ limited: true, retryAfterMs }` when the caller should be blocked.
   */
  check(key: string): { limited: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || now - entry.timestamp > this.windowMs) {
      // First request in a new window
      this.map.set(key, { count: 1, timestamp: now });
      return { limited: false, retryAfterMs: 0 };
    }

    entry.count += 1;

    if (entry.count > this.max) {
      const retryAfterMs = this.windowMs - (now - entry.timestamp);
      return { limited: true, retryAfterMs: Math.max(retryAfterMs, 0) };
    }

    return { limited: false, retryAfterMs: 0 };
  }

  private startCleanup() {
    // Avoid duplicate timers when the module is hot-reloaded in dev
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.map) {
        if (now - entry.timestamp > this.windowMs) {
          this.map.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
    // Allow the process to exit without waiting for the timer
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }
}

/**
 * Extract a best-effort client IP from the request.
 * Parses the first (leftmost) entry from `x-forwarded-for` which is the
 * client IP appended by the outermost trusted proxy (e.g., Vercel edge).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return 'unknown';
}

// ── Pre-built limiters for common use-cases ──────────────────────────

/** AI search – 5 requests per 60 s per IP. */
export const askLimiter = new RateLimiter({ max: 5, windowMs: 60_000 });

/** Email-sending routes – 3 requests per 60 s per IP. */
export const emailLimiter = new RateLimiter({ max: 3, windowMs: 60_000 });

/** General public API – 30 requests per 60 s per IP. */
export const publicApiLimiter = new RateLimiter({ max: 30, windowMs: 60_000 });
