import type { Db } from '../db/client.ts';

export interface RateLimit {
  /** Maximum hits per window. */
  limit: number;
  windowSeconds: number;
}

/**
 * Fixed-window counter in the database (works across restarts and multiple server instances).
 * Returns true if this hit is allowed. Old windows are pruned occasionally.
 */
export async function hitRateLimit(db: Db, key: string, rule: RateLimit, now = Date.now()): Promise<boolean> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const [row] = await db<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `;
  if (Math.random() < 0.01) {
    await db`DELETE FROM rate_limits WHERE window_start < ${new Date(now - 2 * 86_400_000)}`;
  }
  return row.count <= rule.limit;
}

export const RATE_LIMITS = {
  /** Reading availability (options / dates / slots) per IP. */
  availability: { limit: 300, windowSeconds: 600 },
  /** Booking submissions per IP. */
  bookingPerIp: { limit: 10, windowSeconds: 3600 },
} satisfies Record<string, RateLimit>;

/**
 * Abuse threshold, not a clinic rule: one phone number may hold this many upcoming online bookings
 * (generous, so a parent can book for the whole family) before further online bookings are refused
 * with "please call us". Staff bookings are never limited.
 */
export const MAX_UPCOMING_ONLINE_BOOKINGS_PER_PHONE = 10;
