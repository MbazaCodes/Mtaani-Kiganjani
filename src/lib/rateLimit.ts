/**
 * Simple client-side rate limiter for form submissions.
 * Prevents rapid-fire duplicate submissions.
 */
const timestamps: Map<string, number[]> = new Map();

/**
 * Check if an action is rate-limited.
 * @param key - unique identifier (e.g. "submit_application", "send_message")
 * @param maxAttempts - max attempts in the window (default: 3)
 * @param windowMs - time window in ms (default: 60000 = 1 minute)
 * @returns true if the action is ALLOWED, false if rate-limited
 */
export function checkRateLimit(key: string, maxAttempts = 3, windowMs = 60_000): boolean {
  const now = Date.now();
  const prev = timestamps.get(key) || [];

  // Remove old entries outside the window
  const recent = prev.filter((t) => now - t < windowMs);

  if (recent.length >= maxAttempts) {
    return false; // rate limited
  }

  recent.push(now);
  timestamps.set(key, recent);
  return true; // allowed
}

/**
 * Get remaining cooldown time in seconds.
 * Returns 0 if not rate-limited.
 */
export function getRateLimitCooldown(key: string, maxAttempts = 3, windowMs = 60_000): number {
  const now = Date.now();
  const prev = timestamps.get(key) || [];
  const recent = prev.filter((t) => now - t < windowMs);

  if (recent.length < maxAttempts) return 0;

  const oldest = Math.min(...recent);
  const cooldown = Math.ceil((oldest + windowMs - now) / 1000);
  return Math.max(0, cooldown);
}
